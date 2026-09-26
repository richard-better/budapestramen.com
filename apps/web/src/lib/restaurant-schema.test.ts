import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { restaurantSchema } from "./restaurant-schema";

const place = {
  name: "Example ramen shop",
  address: "Budapest",
  district: "VII",
  mapsUrl: "https://maps.app.goo.gl/example-ramen-shop",
  menuUrl: "https://example.com/ramen-menu",
  coordinates: { lat: 47.5, lng: 19.06 },
  styles: ["Shoyu"],
  vegan: true,
  recommended: false,
  google: { rating: 4.5, reviews: 100 },
  source: { name: "Supplied guide", date: "2026-09-26" },
};

describe("restaurant content validation", () => {
  it("accepts shop facts with map and menu links", () => {
    assert.equal(restaurantSchema.parse(place).menuUrl, "https://example.com/ramen-menu");
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
  it("rejects invalid coordinates, links, and unknown styles before publication", () => {
    for (const patch of [
      { coordinates: { lat: 100, lng: 19 } },
      { mapsUrl: "not a URL" },
      { styles: ["Pizza"] },
      { google: { rating: 6, reviews: -1 } },
      { menuUrl: "not a URL" },
    ])
      assert.equal(restaurantSchema.safeParse({ ...place, ...patch }).success, false);
  });
});
