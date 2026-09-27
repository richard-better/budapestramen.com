import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { publishResearch } from "./publish-research";
import { researchSchema } from "./research-schema";
import mori from "../../../../research/restaurants/mori-ramen/research.json";

describe("public research projection", () => {
  it("publishes verified facts without leaking menus, evidence or individual prices", () => {
    const place = publishResearch(researchSchema.parse(mori));
    assert.ok(place);
    assert.equal(place.rec, false);
    assert.equal(place.research?.price?.min, 3990);
    assert.equal(place.research?.price?.max, 4890);
    assert.equal(place.research?.features.japaneseOwned, "unknown");
    const json = JSON.stringify(place);
    for (const privateField of ['"bowls"', '"evidence"', '"cache"', '"limitations"'])
      assert.equal(json.includes(privateField), false);
  });
  it("keeps candidates private and requires map-ready public entries", () => {
    const record = researchSchema.parse(mori);
    assert.equal(publishResearch({ ...record, publication: "candidate" }), null);
    record.identity.coordinates = { status: "unknown" };
    assert.throws(() => publishResearch(record), /verified address/);
  });
  it("does not turn unknown ratings into zero or old menus into current prices", () => {
    const record = researchSchema.parse(mori);
    delete record.google;
    record.pricing.forEach((pricing) => {
      pricing.menuDate = "2025-01-01";
    });
    const place = publishResearch(record);
    assert.equal(place?.rating, null);
    assert.equal(place?.research?.price, null);
  });
});
