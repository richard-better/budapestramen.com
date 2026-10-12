import type { Coordinates } from "../data/restaurants";
import type { MapPosition } from "./guide";

export interface ViewportSize {
  width: number;
  height: number;
}

export interface MapRect {
  origin: { x: number; y: number };
  size: ViewportSize;
}

export function clampZoom(zoom: number): number {
  return Math.max(3, Math.min(18, zoom));
}

function project({ lat, lng }: Coordinates) {
  const latitude = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return {
    x: (lng + 180) / 360,
    y: (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2,
  };
}

function unproject({ x, y }: { x: number; y: number }): Coordinates {
  return {
    lat: Math.max(-85, Math.min(85, (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI)),
    lng: ((((x * 360) % 360) + 360) % 360) - 180,
  };
}

// Shared URLs use Leaflet's 256-pixel zoom scale; MapKit uses normalized Mercator rectangles.
export function mapRectForPosition(position: MapPosition, viewport: ViewportSize): MapRect {
  const center = project(position);
  const scale = 256 * 2 ** clampZoom(position.zoom);
  const size = { width: viewport.width / scale, height: viewport.height / scale };
  return {
    origin: { x: center.x - size.width / 2, y: center.y - size.height / 2 },
    size,
  };
}

export function positionForMapRect(rect: MapRect, viewport: ViewportSize): MapPosition {
  return {
    ...unproject({
      x: rect.origin.x + rect.size.width / 2,
      y: rect.origin.y + rect.size.height / 2,
    }),
    zoom: Math.log2(viewport.width / rect.size.width / 256),
  };
}

export function fitMapPosition(
  places: Coordinates[],
  viewport: ViewportSize,
  maxZoom: number,
): MapPosition | null {
  if (!places.length) return null;
  const points = places.map(project);
  const left = Math.min(...points.map((point) => point.x));
  const right = Math.max(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const bottom = Math.max(...points.map((point) => point.y));
  const scale = Math.min(
    Math.max(1, viewport.width - 80) / (right - left),
    Math.max(1, viewport.height - 170) / (bottom - top),
    256 * 2 ** clampZoom(maxZoom),
  );
  const zoom = clampZoom(Math.log2(scale / 256));
  return {
    ...unproject({ x: (left + right) / 2, y: (top + bottom) / 2 - 35 / (256 * 2 ** zoom) }),
    zoom,
  };
}
