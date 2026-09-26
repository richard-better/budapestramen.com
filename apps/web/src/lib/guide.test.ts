import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Restaurant } from "../data/restaurants";
import {
  distanceBetween,
  filterRestaurants,
  formatDistance,
  guidePath,
  readGuideUrl,
  restaurantLinks,
} from "./guide";

const places: Restaurant[] = [
  {
    id: "ramenka",
    name: "Ramenka",
    address: "Kazinczy u. 3, 1075",
    district: "VII",
    lat: 47.4956,
    lng: 19.0601,
    styles: ["Tonkotsu", "Miso"],
    vegan: true,
    rating: 4.5,
    reviews: 10,
    price: "4–5k",
    rec: true,
    menu: [],
  },
  {
    id: "komachi",
    name: "Komachi Bistro",
    address: "Kazinczy u. 35, 1075",
    district: "VII",
    lat: 47.4992,
    lng: 19.0619,
    styles: ["Tantanmen", "Tonkotsu"],
    vegan: false,
    rating: 4.6,
    reviews: 10,
    price: "4–5k",
    rec: true,
    menu: [],
  },
  {
    id: "momotaro",
    name: "Momotaro Ramen",
    address: "Széchenyi u. 16, 1054",
    district: "V",
    lat: 47.5041,
    lng: 19.0487,
    styles: ["Shoyu", "Shio"],
    vegan: true,
    rating: 4.8,
    reviews: 10,
    price: "3–4k",
    rec: false,
    menu: [],
  },
];
const noFilters = { styles: [], vegan: false, recommended: false };
const ids = (results: Restaurant[]) => results.map((place) => place.id);
const read = (path: string) => readGuideUrl(new URL(path, "https://budapestramen.com"), places);

describe("restaurant filtering and distance", () => {
  it("puts personal recommendations first, then orders by rating", () => {
    assert.deepEqual(ids(filterRestaurants(places, noFilters)), ["komachi", "ramenka", "momotaro"]);
    assert.equal(places[0]?.id, "ramenka");
  });
  it("matches any selected style while requiring both diet and recommendation filters", () => {
    assert.deepEqual(
      ids(
        filterRestaurants(places, { styles: ["Shio", "Tonkotsu"], vegan: true, recommended: true }),
      ),
      ["ramenka"],
    );
    assert.deepEqual(
      ids(filterRestaurants(places, { styles: ["Tantanmen"], vegan: true, recommended: false })),
      [],
    );
  });
  it("sorts by actual distance once a location is available", () => {
    assert.equal(filterRestaurants(places, noFilters, places[2])[0]?.id, "momotaro");
    assert.equal(distanceBetween(places[0]!, places[0]!), 0);
    assert.ok(Math.abs(distanceBetween({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111195) < 1);
  });
  it("formats localized distances", () => {
    assert.equal(formatDistance(582, "en"), "580 m");
    assert.equal(formatDistance(1250, "hu"), "1,3 km");
  });
});

describe("addressable guide state", () => {
  it("takes the language exclusively from the path", () => {
    assert.equal(read("/hu?lang=en")?.language, "hu");
    assert.equal(read("/en?lang=hu")?.language, "en");
    for (const path of [
      "/",
      "/ramenka",
      "/de",
      "/en/ramen-ya/unknown",
      "/hu/ramen-ya/ramenka/extra",
    ])
      assert.equal(read(path), null);
  });
  it("round-trips a restaurant, filters, list view, and viewport", () => {
    const state = read(
      "/hu/ramen-ya/ramenka?view=list&style=Miso&style=Tonkotsu&vegan=1&recommended=1&lat=47.49560&lng=19.06010&zoom=15&directions=1",
    );
    assert.ok(state);
    assert.deepEqual(read(guidePath(state)), state);
    assert.match(guidePath(state), /^\/hu\/ramen-ya\/ramenka\?/);
    assert.ok(!guidePath(state).includes("lang="));
  });
  it("round-trips all panels and mobile preview/menu state", () => {
    for (const path of [
      "/en?panel=filters",
      "/hu?panel=about",
      "/en?panel=language",
      "/hu?menu=1",
      "/en/ramen-ya/ramenka?preview=1",
    ]) {
      const state = read(path);
      assert.ok(state);
      assert.deepEqual(read(guidePath(state)), state);
    }
  });
  it("switches language without losing a restaurant or filters", () => {
    const state = read("/en/ramen-ya/ramenka?style=Miso&vegan=1&view=list");
    assert.ok(state);
    const switched = read(guidePath({ ...state, language: "hu" }));
    assert.deepEqual(switched, { ...state, language: "hu" });
  });
  it("ignores unknown filters, duplicate styles, and invalid map coordinates", () => {
    const state = read(
      "/en?style=Pizza&style=Miso&style=Miso&lat=NaN&lng=19&zoom=99&panel=unknown",
    );
    assert.deepEqual(state?.filters.styles, ["Miso"]);
    assert.equal(state?.map, null);
    assert.equal(state?.panel, null);
    assert.equal(read("/en?lat=&lng=&zoom=14")?.map, null);
    assert.equal(read("/en?lat=91&lng=19&zoom=14")?.map, null);
    assert.deepEqual(read("/en?lat=0&lng=0&zoom=3")?.map, { lat: 0, lng: 0, zoom: 3 });
  });
  it("only opens directions for a full restaurant detail", () => {
    assert.equal(read("/en?directions=1")?.directions, false);
    assert.equal(read("/en/ramen-ya/ramenka?preview=1&directions=1")?.directions, false);
    assert.equal(read("/en/ramen-ya/ramenka?directions=1")?.directions, true);
  });
  it("creates real encoded navigation links for each restaurant", () => {
    const links = restaurantLinks(places[0]!);
    const google = new URL(links.directions[0]!.href);
    assert.equal(google.searchParams.get("destination"), "Ramenka, Kazinczy u. 3, 1075, Budapest");
    assert.equal(links.directions.length, 4);
    assert.ok(links.directions.every((link) => link.href.startsWith("https://")));
  });
});
