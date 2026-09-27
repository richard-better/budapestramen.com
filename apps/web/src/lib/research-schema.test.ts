import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  featureSchema,
  menuSchema,
  pricingSchema,
  ramenPriceRange,
  researchSchema,
} from "./research-schema";
import seed from "./fixtures/incomplete-research.json";

const evidence = [
  {
    source: { type: "website", url: "https://example.com/menu" },
    checkedOn: "2026-09-26",
    note: "Branch menu lists these bowls.",
  },
];
const menu = {
  id: "2026-09",
  url: "https://example.com/menu",
  type: "official",
  checkedOn: "2026-09-26",
  branchNote: "This branch only",
  cache: { status: "missing", reason: "Awaiting download" },
};
const pricing = pricingSchema.parse({
  menuId: menu.id,
  currency: "HUF",
  basis: "dine-in",
  coverage: "complete",
  menuDate: "2026-09-01",
  checkedOn: "2026-09-26",
  evidence,
  bowls: [
    { name: "Shoyu", price: 3900, eligibility: "standard" },
    { name: "Special", price: 5900, eligibility: "standard" },
    { name: "Egg", price: 500, eligibility: "extra" },
    { name: "Lunch combo", price: 6900, eligibility: "combo" },
    { name: "Promotion", price: 2900, eligibility: "promotion" },
    { name: "Small", price: 1900, eligibility: "small" },
  ],
});

describe("restaurant research", () => {
  it("preserves unknown and requires evidence for positive and negative claims", () => {
    assert.deepEqual(featureSchema.parse({ status: "unknown" }), { status: "unknown" });
    for (const status of ["yes", "no"]) {
      assert.equal(featureSchema.safeParse({ status }).success, false);
      assert.equal(featureSchema.safeParse({ status, evidence }).success, true);
    }
    assert.equal(featureSchema.safeParse(false).success, false);
  });
  it("accepts incomplete research without manufacturing facts", () => {
    assert.equal(researchSchema.parse(seed).features.veganRamen.status, "unknown");
  });
  it("allows mixed ownership and rejects facts without evidence", () => {
    const record = structuredClone(seed);
    const features = {
      ...record.features,
      japaneseOwned: { status: "yes", evidence },
      hungarianOwned: { status: "yes", evidence },
    };
    assert.equal(researchSchema.safeParse({ ...record, features }).success, true);
    assert.equal(
      researchSchema.safeParse({
        ...record,
        identity: { ...record.identity, address: { status: "known", value: "Budapest" } },
      }).success,
      false,
    );
  });
  it("rejects missing menu references and duplicate menu IDs", () => {
    assert.equal(researchSchema.safeParse({ ...seed, pricing: [pricing] }).success, false);
    assert.equal(
      researchSchema.safeParse({ ...seed, menus: [menu], pricing: [pricing] }).success,
      true,
    );
    assert.equal(researchSchema.safeParse({ ...seed, menus: [menu, menu] }).success, false);
  });
  it("requires cache provenance and prevents paths escaping menu storage", () => {
    const file = { path: "menus/2026-09.pdf", sourceUrl: menu.url, capturedOn: "2026-09-26" };
    assert.equal(
      menuSchema.safeParse({ ...menu, cache: { status: "cached", files: [file] } }).success,
      true,
    );
    for (const path of ["../menu.pdf", "menus/../../menu.pdf", "/tmp/menu.pdf"]) {
      assert.equal(
        menuSchema.safeParse({ ...menu, cache: { status: "cached", files: [{ ...file, path }] } })
          .success,
        false,
      );
    }
    assert.equal(
      menuSchema.safeParse({ ...menu, cache: { status: "cached", files: [] } }).success,
      false,
    );
  });
  it("calculates only the full-size standalone dine-in range", () => {
    assert.deepEqual(ramenPriceRange(pricing), {
      min: 3900,
      max: 5900,
      currency: "HUF",
      checkedOn: "2026-09-26",
    });
    assert.equal(ramenPriceRange({ ...pricing, basis: "delivery" }), null);
    assert.deepEqual(
      ramenPriceRange({ ...pricing, menuDate: undefined }),
      ramenPriceRange(pricing),
    );
    assert.equal(ramenPriceRange({ ...pricing, coverage: "partial" }), null);
    assert.equal(
      ramenPriceRange({
        ...pricing,
        bowls: pricing.bowls.filter((bowl) => bowl.eligibility !== "standard"),
      }),
      null,
    );
  });
});
