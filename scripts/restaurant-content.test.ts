import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { restaurantSchema } from "../apps/web/src/lib/restaurant-schema";

const directory = new URL("../apps/web/src/content/restaurants/", import.meta.url);
const files = (await readdir(directory)).filter((name) => name.endsWith(".yaml"));
const restaurants = new Map(
  await Promise.all(
    files.map(
      async (name) =>
        [
          name.slice(0, -5),
          restaurantSchema.parse(Bun.YAML.parse(await readFile(new URL(name, directory), "utf8"))),
        ] as const,
    ),
  ),
);

describe("published restaurant YAML", () => {
  it("preserves verified prices and tri-state features in the content collection", () => {
    const mori = restaurants.get("mori-ramen")!;
    assert.deepEqual(mori.details?.price, {
      min: 3990,
      max: 4890,
      currency: "HUF",
      checkedOn: "2026-09-27",
    });
    assert.equal(mori.details?.features.japaneseOwned, "unknown");
    assert.equal(restaurants.get("nagomi")?.details?.features.reservations, "no");
    assert.equal(mori.details?.features.reservations, "yes");
  });
  it("keeps unknown ratings and styles without manufacturing values", () => {
    assert.equal(restaurants.get("hachi")?.google.rating, null);
    assert.deepEqual(restaurants.get("pearl-harbor")?.styles, []);
  });
  it("excludes private menu item prices and evidence from public content", async () => {
    for (const name of files) {
      const value = Bun.YAML.parse(await readFile(new URL(name, directory), "utf8"));
      const json = JSON.stringify(value);
      for (const field of ['"bowls"', '"evidence"', '"cache"'])
        assert.equal(json.includes(field), false, name);
    }
  });
});
