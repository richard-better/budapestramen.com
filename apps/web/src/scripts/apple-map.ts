import { load, type Annotation, type Map as AppleMap, type MapKit } from "@apple/mapkit-loader";
import type { Coordinates, Restaurant } from "../data/restaurants";
import type { Language, MapPosition } from "../lib/guide";
import {
  clampZoom,
  fitMapPosition,
  mapRectForPosition,
  positionForMapRect,
} from "../lib/map-viewport";

interface MapCallbacks {
  onSelect: (id: string) => void;
  onMove: (position: MapPosition) => void;
  onTap: () => void;
  onReady: () => void;
  onError: () => void;
}

export async function createRestaurantMap(
  element: HTMLElement,
  token: string,
  language: Language,
  callbacks: MapCallbacks,
) {
  if (!token) throw new Error("PUBLIC_APPLE_MAPS_TOKEN is required");
  const kit = await load({ version: "6", libraries: ["map", "annotations"] });
  kit.addEventListener("error", callbacks.onError);
  kit.addEventListener("configuration-change", (event) => {
    if ("status" in event && event.status === "Initialized") callbacks.onReady();
  });
  kit.init({ authorizationCallback: (done) => done(token), language });
  return new RestaurantMap(element, kit, callbacks);
}

export class RestaurantMap {
  private readonly map: AppleMap;
  private readonly markers = new Map<
    string,
    { annotation: Annotation; button: HTMLButtonElement }
  >();
  private userMarker: Annotation | null = null;
  private readonly gestures = new Set<string>();
  private readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  constructor(
    private readonly element: HTMLElement,
    private readonly kit: MapKit,
    private readonly callbacks: MapCallbacks,
  ) {
    this.map = new kit.Map(element, {
      colorScheme: kit.ColorScheme.Light,
      showsZoomControl: false,
      showsMapTypeControl: false,
      showsCompass: kit.FeatureVisibility.Hidden,
      showsPointsOfInterest: false,
      isRotationEnabled: false,
    });
    this.moveTo({ lat: 47.502, lng: 19.056, zoom: 14 }, false);
    // MapKit also emits zoom-end after programmatic moves, without a gesture start.
    for (const gesture of ["scroll", "zoom"]) {
      this.map.addEventListener(`${gesture}-start`, () => this.gestures.add(gesture));
      this.map.addEventListener(`${gesture}-end`, () => {
        if (!this.gestures.delete(gesture) || this.gestures.size) return;
        const position = positionForMapRect(this.map.visibleMapRect, this.viewport());
        const zoom = clampZoom(position.zoom);
        if (zoom !== position.zoom) this.moveTo({ ...position, zoom }, false);
        callbacks.onMove({ ...position, zoom });
      });
    }
    this.map.addEventListener("single-tap", callbacks.onTap);
  }

  private viewport() {
    const { padding } = this.map;
    return {
      width: Math.max(1, this.element.clientWidth - padding.left - padding.right),
      height: Math.max(1, this.element.clientHeight - padding.top - padding.bottom),
    };
  }

  position(): MapPosition {
    const position = positionForMapRect(this.map.visibleMapRect, this.viewport());
    return { ...position, zoom: clampZoom(position.zoom) };
  }

  moveTo(position: MapPosition, animated: boolean) {
    this.gestures.clear();
    this.map.setVisibleMapRectAnimated(
      mapRectForPosition(position, this.viewport()),
      animated && !this.reducedMotion.matches,
    );
  }

  fit(places: Restaurant[], maxZoom: number, animated: boolean) {
    const position = fitMapPosition(places, this.viewport(), maxZoom);
    if (position) this.moveTo(position, animated);
  }

  zoom(delta: number) {
    const position = this.position();
    position.zoom = clampZoom(position.zoom + delta);
    this.moveTo(position, true);
    this.callbacks.onMove(position);
  }

  render(
    places: Restaurant[],
    selected: string | null,
    user: Coordinates | null,
    language: Language,
    inset: { right: number; bottom: number },
  ) {
    if (this.kit.language !== language) this.kit.language = language;
    if (this.map.padding.right !== inset.right || this.map.padding.bottom !== inset.bottom) {
      this.map.padding = { top: 0, left: 0, ...inset };
    }
    const ids = new Set(places.map((place) => place.id));
    for (const [id, marker] of this.markers) {
      if (!ids.has(id)) {
        this.map.removeAnnotation(marker.annotation);
        this.markers.delete(id);
      }
    }
    for (const place of places) {
      let marker = this.markers.get(place.id);
      if (!marker) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ramen-marker";
        button.title = place.name;
        button.setAttribute("aria-label", place.name);
        const pin = place.rec
          ? "recommended"
          : place.research?.category === "ramen-specialist"
            ? "ramen-specialist"
            : null;
        if (pin) {
          const image = document.createElement("img");
          image.className = "restaurant-pin";
          image.src = `/map-pins/${pin}.svg`;
          image.alt = "";
          image.draggable = false;
          button.append(image);
        } else {
          const dot = document.createElement("span");
          dot.className = "pin-dot";
          button.append(dot);
        }
        button.classList.toggle("has-pin", !!pin);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.callbacks.onSelect(place.id);
        });
        const annotation = new this.kit.Annotation(
          { latitude: place.lat, longitude: place.lng },
          () => button,
          {
            title: place.name,
            accessibilityLabel: place.name,
            anchorOffset: new DOMPoint(0, pin ? 0 : -22),
            calloutEnabled: false,
            animates: false,
            displayPriority: this.kit.AnnotationDisplayPriority.Required,
          },
        );
        marker = { annotation, button };
        this.markers.set(place.id, marker);
        this.map.addAnnotation(annotation);
      }
      marker.button.classList.toggle("is-selected", selected === place.id);
      marker.button.setAttribute("aria-pressed", String(selected === place.id));
      marker.annotation.selected = selected === place.id;
    }
    if (user) {
      const coordinate = { latitude: user.lat, longitude: user.lng };
      if (this.userMarker) this.userMarker.coordinate = coordinate;
      else {
        this.userMarker = new this.kit.Annotation(
          coordinate,
          () => {
            const dot = document.createElement("div");
            dot.className = "user-location-dot";
            return dot;
          },
          {
            anchorOffset: new DOMPoint(0, -9),
            enabled: false,
            animates: false,
            displayPriority: this.kit.AnnotationDisplayPriority.Required,
          },
        );
        this.map.addAnnotation(this.userMarker);
      }
    }
  }
}
