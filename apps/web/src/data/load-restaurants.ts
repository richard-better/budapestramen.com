import { getCollection } from "astro:content";
import { researchSchema } from "../lib/research-schema";
import { publishResearch } from "../lib/publish-research";
import type { Restaurant } from "./restaurants";

export async function loadRestaurants(): Promise<Restaurant[]> {
  const entries = await getCollection("restaurants");
  const curated: Restaurant[] = entries.map(({ id, data }) => ({
    id,
    name: data.name,
    address: data.address,
    district: data.district,
    mapsUrl: data.mapsUrl,
    menuUrl: data.menuUrl,
    ...data.coordinates,
    styles: data.styles,
    vegan: data.vegan,
    rec: data.recommended,
    note: data.recommendation,
    ...data.google,
  }));
  const records = import.meta.glob("../../../../research/restaurants/*/research.json", {
    eager: true,
    import: "default",
  });
  const published = Object.values(records)
    .map((value) => {
      const record = researchSchema.parse(value);
      return publishResearch(
        record,
        curated.find((place) => place.id === record.id),
      );
    })
    .filter((place): place is Restaurant => place !== null);
  return [
    ...published,
    ...curated.filter((place) => !published.some((item) => item.id === place.id)),
  ];
}
