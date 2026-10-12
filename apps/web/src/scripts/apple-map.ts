import { load, type Annotation, type Map as AppleMap, type MapKit } from "@apple/mapkit-loader";
import type { Coordinates, Restaurant } from "../data/restaurants";
import type { Language, MapPosition } from "../lib/guide";
import { translations } from "../lib/translations";
import {
  clampZoom,
  fitMapPosition,
  mapRectForPosition,
  positionForMapRect,
} from "../lib/map-viewport";

interface MapCallbacks {
  onSelect: (id: string) => void;
  onHighlight: (id: string | null) => void;
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
      annotationForCluster: (cluster) => {
        const members = cluster.memberAnnotations.map(({ coordinate }) => ({
          lat: coordinate.latitude,
          lng: coordinate.longitude,
        }));
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ramen-marker ramen-cluster";
        button.dataset.clusterCount = String(members.length);
        button.textContent = String(members.length);
        button.setAttribute(
          "aria-label",
          `${members.length} ${translations[this.kit.language === "hu" ? "hu" : "en"].places}`,
        );
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const position = fitMapPosition(
            members,
            this.viewport(),
            Math.min(18, this.position().zoom + 2),
          );
          if (position) {
            this.moveTo(position, true);
            this.callbacks.onMove(position);
          }
        });
        return new kit.Annotation(cluster.coordinate, () => button, {
          calloutEnabled: false,
          animates: false,
          anchorOffset: new DOMPoint(0, -22),
        });
      },
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

  highlight(id: string | null) {
    for (const [placeId, { button }] of this.markers) {
      button.classList.toggle("is-highlighted", id === placeId);
    }
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
      const isSelected = selected === place.id;
      const hasPin = place.rec || isSelected;
      let marker = this.markers.get(place.id);
      if (!marker) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ramen-marker";
        button.title = place.name;
        button.setAttribute("aria-label", place.name);
        const image = document.createElement("img");
        image.className = "restaurant-pin";
        image.src = place.rec ? "/map-pins/recommended.svg" : "/map-pins/selected.svg";
        image.alt = "";
        image.draggable = false;
        const dot = document.createElement("span");
        dot.className = "pin-dot";
        button.append(dot, image);
        button.classList.toggle("is-recommended", place.rec);
        button.addEventListener("pointerenter", (event) => {
          if (event.pointerType !== "touch") this.callbacks.onHighlight(place.id);
        });
        button.addEventListener("pointerleave", () => this.callbacks.onHighlight(null));
        button.addEventListener("focus", () => this.callbacks.onHighlight(place.id));
        button.addEventListener("blur", () => this.callbacks.onHighlight(null));
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
            anchorOffset: new DOMPoint(0, -22),
            calloutEnabled: false,
            animates: false,
            displayPriority: this.kit.AnnotationDisplayPriority.High,
            clusteringIdentifier: "restaurants",
          },
        );
        marker = { annotation, button };
        this.markers.set(place.id, marker);
        this.map.addAnnotation(annotation);
      }
      marker.button.classList.toggle("is-selected", isSelected);
      marker.button.setAttribute("aria-pressed", String(isSelected));
      marker.annotation.anchorOffset = new DOMPoint(0, hasPin ? 0 : -22);
      marker.annotation.clusteringIdentifier = hasPin ? null : "restaurants";
      marker.annotation.displayPriority = hasPin
        ? this.kit.AnnotationDisplayPriority.Required
        : this.kit.AnnotationDisplayPriority.High;
      marker.annotation.selected = isSelected;
    }
    this.element.querySelectorAll<HTMLElement>("[data-cluster-count]").forEach((button) => {
      button.setAttribute(
        "aria-label",
        `${button.dataset.clusterCount} ${translations[language].places}`,
      );
    });
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
