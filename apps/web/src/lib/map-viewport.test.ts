import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fitMapPosition,
  mapRectForPosition,
  positionForMapRect,
  type MapRect,
} from "./map-viewport";
import { guidePath, readGuideUrl } from "./guide";

function close(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be near ${expected}`);
}

describe("Apple Maps viewport compatibility", () => {
  it("preserves existing shared coordinates and zoom on desktop and mobile", () => {
    const state = readGuideUrl(
      new URL("https://budapestramen.com/en?lat=47.49560&lng=19.06010&zoom=15"),
      [],
    );
    assert.ok(state?.map);
    for (const viewport of [
      { width: 880, height: 800 },
      { width: 390, height: 844 },
    ]) {
      const rect = mapRectForPosition(state.map, viewport);
      close(rect.size.width, viewport.width / (256 * 2 ** 15));
      const position = positionForMapRect(rect, viewport);
      close(position.lat, state.map.lat);
      close(position.lng, state.map.lng);
      close(position.zoom, 15);
      assert.equal(guidePath({ ...state, map: position }), guidePath(state));
    }
  });

  it("uses the same geographic scale with an inset detail panel", () => {
    const position = { lat: 47.5, lng: 19.06, zoom: 14.25 };
    const full = mapRectForPosition(position, { width: 880, height: 800 });
    const inset = mapRectForPosition(position, { width: 456, height: 800 });
    close(full.size.width / 880, inset.size.width / 456);
    close(full.size.height, inset.size.height);
  });

  it("wraps pans across the antimeridian into shareable longitudes", () => {
    const viewport = { width: 880, height: 800 };
    const rect = mapRectForPosition({ lat: 0, lng: 179, zoom: 8 }, viewport);
    rect.origin.x += 2 / 360;
    close(positionForMapRect(rect, viewport).lng, -179);
  });

  it("fits every restaurant inside the space below filters and above attribution", () => {
    const places = [
      { lat: 47.56, lng: 18.99 },
      { lat: 47.44, lng: 19.15 },
      { lat: 47.5, lng: 19.06 },
    ];
    for (const viewport of [
      { width: 880, height: 800 },
      { width: 390, height: 844 },
    ]) {
      const fitted = fitMapPosition(places, viewport, 14);
      assert.ok(fitted);
      assert.ok(fitted.zoom <= 14);
      const bounds = mapRectForPosition(fitted, viewport);
      for (const place of places) {
        const point: MapRect["origin"] = mapRectForPosition(
          { ...place, zoom: fitted.zoom },
          { width: 0, height: 0 },
        ).origin;
        const x = ((point.x - bounds.origin.x) / bounds.size.width) * viewport.width;
        const y = ((point.y - bounds.origin.y) / bounds.size.height) * viewport.height;
        assert.ok(x >= 40 - 1e-7 && x <= viewport.width - 40 + 1e-7);
        assert.ok(y >= 120 - 1e-7 && y <= viewport.height - 50 + 1e-7);
      }
    }
  });

  it("handles empty filters and one restaurant without invalid bounds", () => {
    const viewport = { width: 390, height: 844 };
    assert.equal(fitMapPosition([], viewport, 15), null);
    const position = fitMapPosition([{ lat: 47.5, lng: 19.06 }], viewport, 15);
    assert.ok(position);
    close(position.zoom, 15);
    assert.ok(Object.values(position).every(Number.isFinite));
  });
});
