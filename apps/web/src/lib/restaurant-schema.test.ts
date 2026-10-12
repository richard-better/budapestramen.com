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
  it("allows recommendations without explanatory notes", () => {
    assert.equal(restaurantSchema.safeParse({ ...place, recommended: true }).success, true);
  });
  it("accepts local and HTTPS photos with translated descriptions and source credits", () => {
    const photos = [
      { src: "/photos/ramen.webp", alt: { en: "A bowl of ramen", hu: "Egy tál ramen" } },
      {
        src: "https://example.com/ramen.jpg",
        alt: { en: "Restaurant", hu: "Étterem" },
        credit: "Restaurant",
        sourceUrl: "https://example.com/photos",
      },
    ];
    assert.deepEqual(restaurantSchema.parse({ ...place, photos }).photos, photos);
    assert.deepEqual(restaurantSchema.parse(place).photos, []);
  });
  it("rejects unsafe image URLs and photos without both language descriptions", () => {
    const alt = { en: "Ramen", hu: "Ramen" };
    for (const photo of [
      { src: "javascript:alert(1)", alt },
      { src: "http://example.com/ramen.jpg", alt },
      { src: "//example.com/ramen.jpg", alt },
      { src: "/photos/ramen.jpg", alt: { en: "Ramen" } },
      { src: "/photos/ramen.jpg", alt, sourceUrl: "javascript:alert(1)" },
    ])
      assert.equal(restaurantSchema.safeParse({ ...place, photos: [photo] }).success, false);
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
