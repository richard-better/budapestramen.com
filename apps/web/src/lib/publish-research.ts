import { ramenStyles, type Restaurant } from "../data/restaurants";
import { ramenPriceRange, type RestaurantResearch } from "./research-schema";

export function publishResearch(
  record: RestaurantResearch,
  existing?: Restaurant,
): Restaurant | null {
  if (record.publication !== "listed") return null;
  const { address, district, maps, coordinates, category } = record.identity;
  if (address.status !== "known" || maps.status !== "known" || coordinates.status !== "known")
    throw new Error(
      `Listed restaurant ${record.id} needs a verified address, Maps link and coordinates`,
    );
  const links = Object.fromEntries(
    Object.entries(record.links).flatMap(([key, link]) =>
      link.status === "known" ? [[key, link.value]] : [],
    ),
  );
  const aliases: Record<string, string> = {
    "Dan dan": "Tantanmen",
    Dandan: "Tantanmen",
    "Chicken paitan": "Paitan",
  };
  const styles =
    record.food.styles.status === "known"
      ? record.food.styles.value
          .map((style) => aliases[style] ?? style)
          .filter((style): style is (typeof ramenStyles)[number] =>
            ramenStyles.includes(style as (typeof ramenStyles)[number]),
          )
      : (existing?.styles ?? []);
  const price = record.pricing
    .toSorted((a, b) => b.checkedOn.localeCompare(a.checkedOn))
    .filter(
      (pricing) =>
        !pricing.menuDate ||
        Date.parse(pricing.checkedOn) - Date.parse(pricing.menuDate) <= 180 * 24 * 60 * 60 * 1000,
    )
    .map(ramenPriceRange)
    .find((range) => range !== null);
  return {
    id: record.id,
    name: record.name,
    address: address.value,
    district: district.status === "known" ? district.value : (existing?.district ?? "Budapest"),
    mapsUrl: maps.value,
    menuUrl: links.menu ?? maps.value,
    ...coordinates.value,
    styles: [...new Set(styles)],
    vegan: record.features.veganRamen.status === "yes",
    rec: existing?.rec ?? false,
    note: existing?.note,
    rating:
      record.google?.status === "known" ? record.google.value.rating : (existing?.rating ?? null),
    reviews:
      record.google?.status === "known" ? record.google.value.reviews : (existing?.reviews ?? null),
    research: {
      category: category.status === "known" ? category.value : null,
      links,
      features: Object.fromEntries(
        Object.entries(record.features).map(([key, value]) => [key, value.status]),
      ),
      price: price ?? null,
      serviceCharge:
        record.visiting.serviceCharge.status === "known"
          ? record.visiting.serviceCharge.value
          : null,
      checkedOn:
        record.menus
          .map((menu) => menu.checkedOn)
          .sort()
          .at(-1) ?? null,
      menuType: record.menus.find((menu) => menu.url === links.menu)?.type ?? null,
    },
  };
}
