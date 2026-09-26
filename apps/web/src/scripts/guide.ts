import L from "leaflet";
import {
  ramenStyles,
  type Coordinates,
  type RamenStyle,
  type Restaurant,
} from "../data/restaurants";
import {
  distanceBetween,
  filterRestaurants,
  formatDistance,
  guidePath,
  readGuideUrl,
  type GuideState,
  type Language,
} from "../lib/guide";
import { translations, type TranslationKey } from "../lib/translations";

function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`Missing guide element: ${selector}`);
  return result;
}

const restaurants: Restaurant[] = JSON.parse(element("#restaurant-data").textContent ?? "[]");
const initial = readGuideUrl(new URL(location.href), restaurants);
if (!initial) throw new Error("Invalid guide URL");
let state: GuideState = initial;
let user: Coordinates | null = null;
let locating = false;
let toastTimer: ReturnType<typeof setTimeout>;
let applyingMap = false;
const mobile = matchMedia("(max-width: 959px)");
const root = element("#ramen-guide");
const mapElement = element("#restaurant-map");
const list = element("#restaurant-list");
const detail = element<HTMLDialogElement>("#detail-panel");
const filters = element<HTMLDialogElement>("#filters-panel");
const about = element<HTMLDialogElement>("#about-dialog");
const languageDialog = element<HTMLDialogElement>("#language-dialog");
const menu = element("#mobile-menu");
const preview = element<HTMLButtonElement>("#map-preview");
const markers = new Map<string, L.Marker>();
let userMarker: L.Marker | undefined;
const map = L.map(mapElement, {
  zoomControl: false,
  minZoom: 3,
  maxZoom: 18,
  zoomAnimation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
  fadeAnimation: false,
}).setView([47.502, 19.056], 14);
const tiles = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      'Tiles © <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>',
    maxNativeZoom: 16,
    maxZoom: 18,
  },
);
let mapLoaded = false;
const mapTimeout = setTimeout(() => showMapError(), 12_000);
function showMapError() {
  if (mapLoaded) return;
  const message = element("#map-message");
  message.dataset.i18n = "mapError";
  message.textContent = translations[state.language].mapError;
  message.hidden = false;
}
tiles.on("tileload", () => {
  mapLoaded = true;
  clearTimeout(mapTimeout);
  element("#map-message").hidden = true;
});
tiles.on("tileerror", showMapError);
tiles.addTo(map);

function navigate(patch: Partial<GuideState>, replace = false) {
  state = { ...state, ...patch };
  const path = guidePath(state);
  if (path !== location.pathname + location.search) {
    history[replace ? "replaceState" : "pushState"](null, "", path);
  }
  render();
}

function selectedPlace() {
  return restaurants.find((place) => place.id === state.selected);
}

function select(id: string, showPreview = false) {
  navigate({
    selected: id,
    preview: showPreview,
    panel: null,
    menu: false,
    directions: false,
    map: null,
  });
}

function closeDetail() {
  navigate({ selected: null, preview: false, directions: false });
}

function showToast(message: string) {
  clearTimeout(toastTimer);
  const toast = element("#toast");
  toast.textContent = message;
  toast.hidden = false;
  toast.showPopover();
  toastTimer = setTimeout(() => {
    toast.hidePopover();
    toast.hidden = true;
  }, 5000);
}

function syncDialog(dialog: HTMLDialogElement, open: boolean, modal: boolean) {
  if (!open) {
    if (dialog.open) dialog.close();
    return;
  }
  if (dialog.open && dialog.matches(":modal") === modal) return;
  if (dialog.open) dialog.close();
  if (modal) dialog.showModal();
  else dialog.show();
}

function syncPopover(popover: HTMLElement, open: boolean) {
  if (popover.matches(":popover-open") === open) return;
  if (open) popover.showPopover();
  else popover.hidePopover();
}

function positionDirections() {
  const popover = detail.querySelector<HTMLElement>("#directions-menu");
  const trigger = detail.querySelector<HTMLElement>(".directions-button");
  if (!popover || !trigger || !popover.matches(":popover-open")) return;
  const bounds = trigger.getBoundingClientRect();
  popover.style.left = `${Math.max(12, Math.min(bounds.left, innerWidth - 232))}px`;
  popover.style.top = `${Math.max(12, Math.min(bounds.bottom + 8, innerHeight - popover.offsetHeight - 12))}px`;
}

function render() {
  const t = translations[state.language];
  const place = selectedPlace();
  const detailOpen = !!place && (!state.preview || !mobile.matches) && state.panel !== "filters";
  root.dataset.view = state.view;
  root.dataset.detail = String(detailOpen);
  root.dataset.preview = String(!!place && state.preview && state.view === "map");
  document.documentElement.lang = state.language;
  element<HTMLLinkElement>('link[rel="manifest"]').href = `/${state.language}/site.webmanifest`;
  document.title = place
    ? `${place.name} - Budapest Ramen`
    : `Budapest Ramen - ${state.language === "hu" ? "Találd meg a kedvenc ramened" : "Find your next bowl"}`;
  document
    .querySelector<HTMLLinkElement>('link[rel="canonical"]')
    ?.setAttribute(
      "href",
      location.origin + `/${state.language}${state.selected ? `/ramen-ya/${state.selected}` : ""}`,
    );

  if (place && detail.dataset.place !== place.id) {
    const template = element<HTMLTemplateElement>(`#detail-${place.id}`);
    detail.replaceChildren(template.content.cloneNode(true));
    detail.dataset.place = place.id;
  }

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((node) => {
    node.textContent = t[node.dataset.i18n as TranslationKey];
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-label]").forEach((node) => {
    const text = t[node.dataset.i18nLabel as TranslationKey];
    node.setAttribute("aria-label", text);
    node.title = text;
  });
  document.querySelectorAll<HTMLAnchorElement>("[data-language]").forEach((node) => {
    const language = node.dataset.language as Language;
    node.setAttribute("aria-current", String(language === state.language));
    node.href = guidePath({ ...state, language, panel: null, menu: false });
  });
  element<HTMLAnchorElement>(".brand").href = `/${state.language}`;
  document.querySelectorAll<HTMLElement>(".view-switch [data-view]").forEach((node) => {
    node.setAttribute("aria-pressed", String(node.dataset.view === state.view));
  });
  document.querySelectorAll<HTMLElement>("[data-style]").forEach((node) => {
    node.setAttribute(
      "aria-pressed",
      String(state.filters.styles.includes(node.dataset.style as RamenStyle)),
    );
  });
  document.querySelectorAll<HTMLElement>("[data-filter]").forEach((node) => {
    const active = state.filters[node.dataset.filter as "recommended" | "vegan"];
    node.setAttribute(
      node.getAttribute("role") === "switch" ? "aria-checked" : "aria-pressed",
      String(active),
    );
  });
  document
    .querySelectorAll('[data-action="filters"]')
    .forEach((node) => node.setAttribute("aria-expanded", String(state.panel === "filters")));
  document
    .querySelectorAll('[data-action="menu"]')
    .forEach((node) => node.setAttribute("aria-expanded", String(state.menu)));
  document
    .querySelectorAll('[data-action="directions"]')
    .forEach((node) => node.setAttribute("aria-expanded", String(state.directions)));
  const count =
    state.filters.styles.length + Number(state.filters.vegan) + Number(state.filters.recommended);
  element("#filter-count").hidden = count === 0;
  element("#filter-count").textContent = `· ${count}`;

  const visible = filterRestaurants(restaurants, state.filters, user);
  const visibleIds = new Set(visible.map((restaurant) => restaurant.id));
  document.querySelectorAll<HTMLElement>("[data-row]").forEach((row) => {
    row.hidden = !visibleIds.has(row.dataset.row!);
  });
  visible.forEach((restaurant, index) => {
    const row = element(`[data-row="${restaurant.id}"]`);
    if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
  });
  restaurants.forEach((restaurant) => {
    const link = element<HTMLAnchorElement>(`[data-select="${restaurant.id}"]`);
    link.setAttribute("aria-current", restaurant.id === state.selected ? "page" : "false");
    link.href = guidePath({
      ...state,
      selected: restaurant.id,
      preview: false,
      panel: null,
      menu: false,
      directions: false,
      map: null,
    });
    element(`[data-distance="${restaurant.id}"]`).textContent = user
      ? formatDistance(distanceBetween(user, restaurant), state.language)
      : `★ ${restaurant.rating.toFixed(1)}`;
    element(`[data-metric-label="${restaurant.id}"]`).textContent = user
      ? `★ ${restaurant.rating.toFixed(1)}`
      : "Google";
  });
  const countLabel = `${visible.length} ${t.places}${user ? ` · ${t.near}` : ""}`;
  document.querySelectorAll("[data-count]").forEach((node) => {
    node.textContent = countLabel;
  });
  element("#show-results").textContent = `${t.show} ${visible.length} ${t.places}`;
  element("#empty-state").hidden = visible.length !== 0;
  element("#map-empty").hidden = visible.length > 0 || state.view === "list" || !!place;

  if (place) {
    if (place.note)
      element(`[data-note="${place.id}"]`).textContent = `“${place.note[state.language]}”`;
    detail.querySelectorAll<HTMLElement>("[data-menu-name]").forEach((node) => {
      const item = place.menu[Number(node.dataset.menuName)];
      if (item) node.textContent = item.name[state.language];
      if (item && node.parentElement)
        node.parentElement.querySelector("dd")!.textContent =
          `${item.priceHuf.toLocaleString(state.language)} Ft`;
    });
    element("[data-detail-distance]").textContent = user
      ? formatDistance(distanceBetween(user, place), state.language)
      : "· · ·";
    if (user) element("[data-detail-distance-label]").textContent = t.away;
    element("[data-preview-name]").textContent = place.name;
    element("[data-preview-address]").textContent = place.address;
    element("[data-preview-rating]").textContent = user
      ? formatDistance(distanceBetween(user, place), state.language)
      : `★ ${place.rating.toFixed(1)}`;
    element("[data-preview-tags]").textContent = [
      ...place.styles,
      ...(place.vegan ? [t.vegan] : []),
    ].join(" · ");
    element("[data-preview-pick]").hidden = !place.rec;
  }
  preview.hidden = !place || !state.preview || state.view !== "map" || !mobile.matches;
  syncDialog(detail, detailOpen, mobile.matches);
  syncDialog(filters, state.panel === "filters", mobile.matches);
  syncDialog(about, state.panel === "about", true);
  syncDialog(languageDialog, state.panel === "language", true);
  syncPopover(menu, state.menu && !state.panel && !detailOpen);
  const directions = detail.querySelector<HTMLElement>("#directions-menu");
  if (directions) syncPopover(directions, state.directions && detailOpen && !state.panel);
  positionDirections();

  document.querySelectorAll<HTMLButtonElement>('[data-action="locate"]').forEach((node) => {
    node.disabled = locating;
    node.classList.toggle("is-located", !!user);
  });
  mapElement.inert = mobile.matches && state.view === "list";
  renderMarkers(visible);
  applyingMap = true;
  map.invalidateSize({ pan: false });
  if (state.map) map.setView([state.map.lat, state.map.lng], state.map.zoom, { animate: false });
  else if (place) {
    const zoom = 15;
    const offset = !mobile.matches && detailOpen ? [206, 0] : [0, state.preview ? 60 : 0];
    const center = map.unproject(
      map.project([place.lat, place.lng], zoom).add(L.point(offset[0]!, offset[1]!)),
      zoom,
    );
    map.setView(center, zoom, { animate: false });
  } else if (user) map.setView([user.lat, user.lng], 15, { animate: false });
  else
    map.fitBounds(
      restaurants.map((restaurant) => [restaurant.lat, restaurant.lng] as L.LatLngTuple),
      {
        paddingTopLeft: [40, 120],
        paddingBottomRight: [40, 50],
        maxZoom: 14,
        animate: false,
      },
    );
  applyingMap = false;
}

function renderMarkers(visible: Restaurant[]) {
  const ids = new Set(visible.map((place) => place.id));
  if (state.selected) ids.add(state.selected);
  restaurants.forEach((place) => {
    let marker = markers.get(place.id);
    if (!ids.has(place.id)) {
      marker?.remove();
      return;
    }
    const icon = L.divIcon({
      className: `ramen-marker${place.rec ? " is-recommended" : ""}${state.selected === place.id ? " is-selected" : ""}`,
      html: `<span class="pin-dot">${place.rec ? "★" : ""}</span>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    if (!marker) {
      marker = L.marker([place.lat, place.lng], {
        icon,
        title: place.name,
        alt: place.name,
        keyboard: true,
      });
      marker.on("click", () => select(place.id, mobile.matches));
      marker.bindTooltip(place.name, { direction: "top", offset: [0, -16] });
      markers.set(place.id, marker);
    } else marker.setIcon(icon);
    marker.setZIndexOffset(state.selected === place.id ? 1000 : place.rec ? 500 : 0);
    marker.addTo(map);
    marker.getElement()?.setAttribute("aria-label", place.name);
  });
}

function setFilter(patch: Partial<GuideState["filters"]>) {
  const next = { ...state.filters, ...patch };
  const keepSelected = filterRestaurants(restaurants, next).some(
    (place) => place.id === state.selected,
  );
  navigate({
    filters: next,
    ...(keepSelected ? {} : { selected: null, preview: false, directions: false }),
  });
}

function locate() {
  if (locating) return;
  if (!navigator.geolocation) {
    showToast(translations[state.language].locFail);
    return;
  }
  locating = true;
  showToast(translations[state.language].locating);
  render();
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating = false;
      user = { lat: position.coords.latitude, lng: position.coords.longitude };
      userMarker?.remove();
      userMarker = L.marker([user.lat, user.lng], {
        icon: L.divIcon({ className: "user-location-dot", iconSize: [18, 18], iconAnchor: [9, 9] }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 2000,
      }).addTo(map);
      element("#toast").hidden = true;
      element("#toast").hidePopover();
      // Location permission and the user's coordinates stay in memory, never in a shared URL.
      render();
    },
    () => {
      locating = false;
      render();
      showToast(translations[state.language].locFail);
    },
    { timeout: 8000, maximumAge: 60_000 },
  );
}

root.addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const target = event.target.closest<HTMLElement>("a, button");
  if (!target) return;
  if (
    target instanceof HTMLAnchorElement &&
    (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
  )
    return;
  if (target.dataset.select) {
    event.preventDefault();
    select(target.dataset.select);
    return;
  }
  if (target.dataset.language) {
    event.preventDefault();
    navigate({ language: target.dataset.language as Language, panel: null, menu: false });
    return;
  }
  if (target.dataset.style && ramenStyles.includes(target.dataset.style as RamenStyle)) {
    const style = target.dataset.style as RamenStyle;
    setFilter({
      styles: state.filters.styles.includes(style)
        ? state.filters.styles.filter((item) => item !== style)
        : [...state.filters.styles, style],
    });
    return;
  }
  if (target.dataset.filter === "vegan" || target.dataset.filter === "recommended") {
    setFilter({ [target.dataset.filter]: !state.filters[target.dataset.filter] });
    return;
  }
  if (target.dataset.view === "map" || target.dataset.view === "list") {
    navigate({ view: target.dataset.view });
    return;
  }
  if (target.hasAttribute("data-close-dialog")) {
    navigate({ panel: null });
    return;
  }
  switch (target.dataset.action) {
    case "filters":
      navigate({
        panel: state.panel === "filters" ? null : "filters",
        directions: false,
        menu: false,
      });
      break;
    case "close-filters":
      navigate({ panel: null });
      break;
    case "clear":
      setFilter({ styles: [], vegan: false, recommended: false });
      break;
    case "close-detail":
      closeDetail();
      break;
    case "open-selected":
      navigate({ preview: false, map: null });
      break;
    case "about":
      navigate({ panel: "about", menu: false, directions: false });
      break;
    case "language":
      navigate({ panel: "language", menu: false, directions: false });
      break;
    case "menu":
      navigate({ menu: !state.menu });
      break;
    case "directions":
      navigate({ directions: !state.directions });
      break;
    case "locate":
      locate();
      break;
    case "zoom-in":
      map.zoomIn();
      break;
    case "zoom-out":
      map.zoomOut();
      break;
    case "reset-map": {
      navigate({ selected: null, preview: false, directions: false, map: null });
      const visible = filterRestaurants(restaurants, state.filters);
      if (visible.length)
        map.fitBounds(
          visible.map((place) => [place.lat, place.lng] as L.LatLngTuple),
          { paddingTopLeft: [40, 130], paddingBottomRight: [40, 50], maxZoom: 15, animate: false },
        );
      break;
    }
    case "share":
      try {
        await navigator.clipboard.writeText(location.href);
        showToast(translations[state.language].copied);
      } catch {
        showToast(translations[state.language].copyFailed);
      }
      break;
  }
});

for (const dialog of [detail, filters, about, languageDialog]) {
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (dialog === detail) closeDetail();
    else navigate({ panel: null });
  });
  if (dialog === about || dialog === languageDialog)
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        navigate({ panel: null });
    });
}
menu.addEventListener("toggle", () => {
  const open = menu.matches(":popover-open");
  if (state.menu !== open) navigate({ menu: open }, true);
});
root.addEventListener(
  "toggle",
  (event) => {
    if (!(event.target instanceof HTMLElement) || event.target.id !== "directions-menu") return;
    const open = event.target.matches(":popover-open");
    if (state.directions !== open) navigate({ directions: open }, true);
  },
  true,
);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  if (state.directions) navigate({ directions: false });
  else if (state.menu) navigate({ menu: false });
  else if (state.panel) navigate({ panel: null });
  else if (state.selected) closeDetail();
});
window.addEventListener("popstate", () => {
  const restored = readGuideUrl(new URL(location.href), restaurants);
  if (restored) {
    state = restored;
    render();
  }
});
map.on("moveend", () => {
  if (applyingMap) return;
  const center = map.getCenter().wrap();
  state = { ...state, map: { lat: center.lat, lng: center.lng, zoom: map.getZoom() } };
  history.replaceState(null, "", guidePath(state));
});
map.on("click", () => {
  if (state.preview) closeDetail();
});
mobile.addEventListener("change", render);
window.addEventListener("resize", positionDirections);
detail.addEventListener("scroll", positionDirections, true);
render();
