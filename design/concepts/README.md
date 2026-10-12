# Budapest Ramen design directions

## iPad app direction

`ipad.html` reimagines the guide as a native iPad map app: a floating translucent
sidebar, system typography, compact search and segmented filters, and place details
in the same sidebar. It includes all 56 restaurants from the current source data.
Search, filters, restaurant selection, sidebar visibility, map panning, and zoom
work. Directions and menu links open the existing restaurant resources.

The map is live MapLibre with OpenFreeMap Positron and a custom light palette. A
snapshot provides the initial background while tiles load. Below tablet widths,
the sidebar becomes a bottom sheet. Reduced motion, reduced transparency, and
increased contrast preferences are supported. This remains a design concept;
it does not alter the production guide.

## Earlier liquid glass direction

`liquid-glass.html` develops the requested high-end direction: Budapest night
photography, smoked glass, reflective edges, and a floating navigation indicator.
Try Discover/Map, the recommendation filters, restaurant details, and the mobile
preview. Keyboard focus returns after closing a detail sheet; reduced motion,
transparency, and increased contrast preferences have dedicated treatments.

This is an interactive visual concept. Its map uses the same static snapshot as
the earlier directions; full restaurant and directions links open existing sites.

## Earlier directions

Three responsive, interactive visual concepts for choosing a direction before
changing the live guide. Open `index.html` in a browser. The direction picker and
screen-size toggle work locally; restaurant entries open a sample detail view.

- **The city guide:** an editorial, map-first directory with quiet typography.
- **The food journal:** photography first, with a separate browsing section.
- **The ramen club:** a bold typographic identity and a compact recommendation list.

Restaurant names, addresses, styles, recommendations, and ratings come from the
existing site. These are design studies, not a replacement for the working guide.
The map is a snapshot of the current site's OpenFreeMap basemap; interactive
markers use the same on-screen restaurant positions. The snapshot does not pan.

## Reference assets

The photography illustrates the mood only. It does not depict the listed
restaurants. A production version of the food journal needs original or licensed
photos of those places.

- `assets/ramen-photo.jpg`: [Alimentos Fotogénicos on Unsplash](https://unsplash.com/photos/a-bowl-of-food-with-chopsticks-on-a-wooden-table-ua-RZdLk0OE), [Unsplash License](https://unsplash.com/license).
- `assets/budapest-map.png`: OpenFreeMap, OpenMapTiles, and OpenStreetMap contributors. Attribution is retained in the concepts.
- `assets/budapest-dusk.jpg`: [XAVIER PHOTOGRAPHY on Unsplash](https://unsplash.com/photos/a-city-with-a-river-and-a-bridge-at-night-mV5Mi-nz4PA), [Unsplash License](https://unsplash.com/license).

- `assets/ipad-map-preview.jpg`: initial map snapshot for the iPad concept. OpenFreeMap, OpenMapTiles, and OpenStreetMap attribution is retained.
