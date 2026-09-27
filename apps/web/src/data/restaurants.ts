export const ramenStyles = [
  "Tonkotsu",
  "Shoyu",
  "Miso",
  "Shio",
  "Tantanmen",
  "Tsukemen",
  "Paitan",
  "Cold ramen",
  "Chinese hand-pulled lamian",
] as const;
export type RamenStyle = (typeof ramenStyles)[number];

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Restaurant extends Coordinates {
  id: string;
  name: string;
  address: string;
  district: string;
  mapsUrl: string;
  menuUrl: string;
  styles: RamenStyle[];
  vegan: boolean;
  rating: number | null;
  reviews: number | null;
  rec: boolean;
  research?: {
    category: "ramen-specialist" | "serves-ramen" | null;
    links: Record<string, string>;
    features: Record<string, "yes" | "no" | "unknown">;
    price: { min: number; max: number; currency: "HUF"; checkedOn: string } | null;
    serviceCharge:
      | { type: "none" }
      | { type: "percentage"; amount: number; applicability: string }
      | { type: "fixed"; amount: number; currency: "HUF"; applicability: string }
      | null;
    checkedOn: string | null;
    menuType: string | null;
  };
  note?: { en: string; hu: string };
}
