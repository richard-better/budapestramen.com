import { z } from "zod";
import { ramenStyles } from "../data/restaurants";

const localizedText = z.object({ en: z.string().min(1), hu: z.string().min(1) });

export const restaurantSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  district: z.string().min(1),
  mapsUrl: z.url(),
  menuUrl: z.url(),
  coordinates: z.object({ lat: z.number().min(-85).max(85), lng: z.number().min(-180).max(180) }),
  styles: z.array(z.enum(ramenStyles)),
  vegan: z.boolean(),
  recommended: z.boolean(),
  recommendation: localizedText.optional(),
  google: z.object({
    rating: z.number().min(0).max(5).nullable(),
    reviews: z.number().int().nonnegative().nullable(),
  }),
  details: z
    .object({
      category: z.enum(["ramen-specialist", "serves-ramen"]).nullable(),
      links: z.record(z.string(), z.url()),
      features: z.record(z.string(), z.enum(["yes", "no", "unknown"])),
      price: z
        .object({
          min: z.number().int().nonnegative(),
          max: z.number().int().nonnegative(),
          currency: z.literal("HUF"),
          checkedOn: z.iso.date(),
        })
        .refine((value) => value.min <= value.max, "Minimum price cannot exceed maximum")
        .nullable(),
      serviceCharge: z
        .union([
          z.object({ type: z.literal("none") }),
          z.object({
            type: z.literal("percentage"),
            amount: z.number().positive().max(100),
            applicability: z.string().min(1),
          }),
          z.object({
            type: z.literal("fixed"),
            amount: z.number().int().nonnegative(),
            currency: z.literal("HUF"),
            applicability: z.string().min(1),
          }),
        ])
        .nullable(),
      checkedOn: z.iso.date().nullable(),
      menuType: z.enum(["official", "maps", "social", "ordering"]).nullable(),
    })
    .optional(),
  source: z.object({ name: z.string().min(1), date: z.iso.date(), url: z.url().optional() }),
});
