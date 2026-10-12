import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { restaurantGallery } from "./gallery";

const photos = Array.from({ length: 6 }, (_, index) => ({
  src: `/photos/${index}.jpg`,
  alt: { en: `Photo ${index}`, hu: `${index}. fotó` },
}));

describe("restaurant galleries", () => {
  it("uses placehold.co images until a restaurant has its own photos", () => {
    for (const place of [{}, { photos: [] }]) {
      const gallery = restaurantGallery(place);
      assert.equal(gallery.placeholder, true);
      assert.equal(gallery.photos.length, 6);
      assert.ok(gallery.photos.every((photo) => new URL(photo.src).hostname === "placehold.co"));
    }
  });
  it("shows short galleries without repeating photos or adding placeholders", () => {
    for (const count of [1, 2, 3]) {
      const gallery = restaurantGallery({ photos: photos.slice(0, count) });
      assert.equal(gallery.placeholder, false);
      assert.equal(gallery.previews.length, count);
      assert.equal(gallery.remaining, 0);
    }
  });
  it("counts the covered photo as part of the remaining photos", () => {
    const gallery = restaurantGallery({ photos });
    assert.deepEqual(gallery.previews, photos.slice(0, 4));
    assert.equal(gallery.remaining, 3);
    assert.equal(restaurantGallery({ photos: photos.slice(0, 4) }).remaining, 1);
  });
});
