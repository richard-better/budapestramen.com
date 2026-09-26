import { z } from "zod";
import { ramenStyles } from "../data/restaurants";

const localizedText = z.object({ en: z.string().min(1), hu: z.string().min(1) });

export const restaurantSchema = z
  .object({
    name: z.string().min(1),
    address: z.string().min(1),
    district: z.string().min(1),
    mapsUrl: z.url(),
    menuUrl: z.url(),
    coordinates: z.object({ lat: z.number().min(-85).max(85), lng: z.number().min(-180).max(180) }),
    styles: z.array(z.enum(ramenStyles)).min(1),
    vegan: z.boolean(),
    recommended: z.boolean(),
    recommendation: localizedText.optional(),
    google: z.object({ rating: z.number().min(0).max(5), reviews: z.number().int().nonnegative() }),
    source: z.object({ name: z.string().min(1), date: z.iso.date(), url: z.url().optional() }),
  })
  .refine(
    (place) => !place.recommended || !!place.recommendation,
    "Recommended places need a note in both languages",
  );
