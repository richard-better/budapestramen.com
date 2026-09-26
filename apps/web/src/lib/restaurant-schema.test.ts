import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { restaurantSchema } from "./restaurant-schema";

const place = {
  name: "Example ramen shop",
  address: "Budapest",
  district: "VII",
  coordinates: { lat: 47.5, lng: 19.06 },
  styles: ["Shoyu"],
  vegan: true,
  recommended: false,
  google: { rating: 4.5, reviews: 100 },
  priceRangeHuf: { min: 3000, max: 5000 },
  menu: [{ name: { en: "Vegetable ramen", hu: "Zöldséges ramen" }, priceHuf: 3900 }],
  source: { name: "Supplied guide", date: "2026-09-26" },
};

describe("restaurant content validation", () => {
  it("accepts shared facts and bilingual menu content", () => {
    assert.equal(restaurantSchema.parse(place).menu[0]?.priceHuf, 3900);
  });
  it("requires an editorial recommendation in both languages for picks", () => {
    assert.equal(restaurantSchema.safeParse({ ...place, recommended: true }).success, false);
    assert.equal(
      restaurantSchema.safeParse({
        ...place,
        recommended: true,
        recommendation: { en: "Good broth" },
      }).success,
      false,
    );
    assert.equal(
      restaurantSchema.safeParse({
        ...place,
        recommended: true,
        recommendation: { en: "Good broth", hu: "Finom alaplé" },
      }).success,
      true,
    );
  });
  it("rejects impossible coordinates, prices, and unknown styles before publication", () => {
    for (const patch of [
      { coordinates: { lat: 100, lng: 19 } },
      { priceRangeHuf: { min: 5000, max: 3000 } },
      { styles: ["Pizza"] },
      { google: { rating: 6, reviews: -1 } },
      { menu: [{ name: { en: "Ramen", hu: "Ramen" }, priceHuf: -200 }] },
    ])
      assert.equal(restaurantSchema.safeParse({ ...place, ...patch }).success, false);
  });
});
