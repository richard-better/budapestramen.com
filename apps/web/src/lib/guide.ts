import {
  ramenStyles,
  type Coordinates,
  type RamenStyle,
  type Restaurant,
} from "../data/restaurants";

export interface Filters {
  styles: RamenStyle[];
  vegan: boolean;
  recommended: boolean;
}

export type Language = "en" | "hu";

export interface MapPosition extends Coordinates {
  zoom: number;
}
export interface GuideState {
  language: Language;
  filters: Filters;
  selected: string | null;
  view: "map" | "list";
  panel: "filters" | "about" | "language" | null;
  preview: boolean;
  menu: boolean;
  directions: boolean;
  map: MapPosition | null;
}

export function distanceBetween(a: Coordinates, b: Coordinates): number {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const arc =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, arc)));
}

export function formatDistance(meters: number, language: Language): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function filterRestaurants(
  restaurants: Restaurant[],
  filters: Filters,
  user: Coordinates | null = null,
): Restaurant[] {
  return restaurants
    .filter(
      (place) =>
        (!filters.recommended || place.rec) &&
        (!filters.vegan || place.vegan) &&
        (!filters.styles.length || filters.styles.some((style) => place.styles.includes(style))),
    )
    .sort((a, b) =>
      user
        ? distanceBetween(user, a) - distanceBetween(user, b)
        : Number(b.rec) - Number(a.rec) ||
          (b.rating ?? -1) - (a.rating ?? -1) ||
          a.name.localeCompare(b.name),
    );
}

export function readGuideUrl(url: URL, restaurants: Restaurant[]): GuideState | null {
  const [language, category, place, ...rest] = url.pathname.split("/").filter(Boolean);
  if ((language !== "en" && language !== "hu") || rest.length) return null;
  if (category && (category !== "ramen-ya" || !place)) return null;
  if (place && !restaurants.some((restaurant) => restaurant.id === place)) return null;
  const params = url.searchParams;
  const panel = params.get("panel");
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const zoom = Number(params.get("zoom"));
  const hasMap =
    ["lat", "lng", "zoom"].every((key) => params.has(key) && params.get(key)?.trim()) &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 85 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180 &&
    Number.isFinite(zoom) &&
    zoom >= 3 &&
    zoom <= 18;
  return {
    filters: {
      styles: ramenStyles.filter((style) => url.searchParams.getAll("style").includes(style)),
      vegan: url.searchParams.get("vegan") === "1",
      recommended: url.searchParams.get("recommended") === "1",
    },
    language,
    selected: place ?? null,
    view: params.get("view") === "list" ? "list" : "map",
    panel: panel === "filters" || panel === "about" || panel === "language" ? panel : null,
    preview: !!place && params.get("preview") === "1",
    menu: params.get("menu") === "1",
    directions: !!place && params.get("preview") !== "1" && params.get("directions") === "1",
    map: hasMap ? { lat, lng, zoom } : null,
  };
}

export function guidePath(state: GuideState): string {
  const params = new URLSearchParams();
  if (state.view === "list") params.set("view", "list");
  ramenStyles
    .filter((style) => state.filters.styles.includes(style))
    .forEach((style) => params.append("style", style));
  if (state.filters.vegan) params.set("vegan", "1");
  if (state.filters.recommended) params.set("recommended", "1");
  if (state.panel) params.set("panel", state.panel);
  if (state.selected && state.preview) params.set("preview", "1");
  if (state.menu) params.set("menu", "1");
  if (state.selected && !state.preview && state.directions) params.set("directions", "1");
  if (state.map) {
    params.set("lat", state.map.lat.toFixed(5));
    params.set("lng", state.map.lng.toFixed(5));
    params.set("zoom", String(state.map.zoom));
  }
  const query = params.toString();
  return `/${state.language}${state.selected ? `/ramen-ya/${state.selected}` : ""}${query ? `?${query}` : ""}`;
}

export function restaurantLinks(place: Restaurant) {
  const query = encodeURIComponent(`${place.name}, ${place.address}, Budapest`);
  const coordinates = `${place.lat},${place.lng}`;
  return {
    maps: place.mapsUrl,
    menu: place.menuUrl,
    directions: [
      { name: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${query}` },
      {
        name: "Apple Maps",
        href: `https://maps.apple.com/?daddr=${coordinates}&q=${encodeURIComponent(place.name)}`,
      },
      { name: "Waze", href: `https://waze.com/ul?ll=${coordinates}&navigate=yes` },
      {
        name: "Citymapper",
        href: `https://citymapper.com/directions?endcoord=${coordinates}&endname=${encodeURIComponent(place.name)}`,
      },
    ],
  };
}
