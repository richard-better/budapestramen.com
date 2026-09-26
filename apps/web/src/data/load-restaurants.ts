import { getCollection } from "astro:content";
import type { Restaurant } from "./restaurants";

export async function loadRestaurants(): Promise<Restaurant[]> {
  const entries = await getCollection("restaurants");
  return entries.map(({ id, data }) => ({
    id,
    name: data.name,
    address: data.address,
    district: data.district,
    ...data.coordinates,
    styles: data.styles,
    vegan: data.vegan,
    rec: data.recommended,
    note: data.recommendation,
    ...data.google,
    price: `${data.priceRangeHuf.min / 1000}–${data.priceRangeHuf.max / 1000}k`,
    menu: data.menu,
  }));
}
