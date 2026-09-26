export const ramenStyles = ["Tonkotsu", "Shoyu", "Miso", "Shio", "Tantanmen", "Tsukemen"] as const;
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
  styles: RamenStyle[];
  vegan: boolean;
  rating: number;
  reviews: number;
  price: string;
  rec: boolean;
  note?: { en: string; hu: string };
  menu: { name: { en: string; hu: string }; priceHuf: number }[];
}
