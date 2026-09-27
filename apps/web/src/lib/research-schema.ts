import { z } from "zod";

const text = z.string().trim().min(1);
const url = z.url({ protocol: /^https?$/ });
const source = z.discriminatedUnion("type", [
  z.strictObject({ type: z.enum(["website", "social", "maps", "ordering"]), url }),
  z.strictObject({ type: z.literal("observation"), observer: text, observedOn: z.iso.date() }),
]);
export const evidenceSchema = z.strictObject({ source, checkedOn: z.iso.date(), note: text });
const evidence = z.array(evidenceSchema).min(1);
const unknown = z.strictObject({
  status: z.literal("unknown"),
  note: text.optional(),
  evidence: evidence.optional(),
});
export const featureSchema = z.union([
  unknown,
  z.strictObject({ status: z.enum(["yes", "no"]), evidence, details: text.optional() }),
]);
const fact = <T extends z.ZodType>(value: T) =>
  z.union([unknown, z.strictObject({ status: z.literal("known"), value, evidence })]);
const link = fact(url);
const money = z.number().int().nonnegative();
const cachePath = z
  .string()
  .regex(/^menus\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(pdf|png|jpg|jpeg|webp|html|txt)$/);
export const menuSchema = z.strictObject({
  id: text,
  url,
  type: z.enum(["official", "maps", "social", "ordering"]),
  checkedOn: z.iso.date(),
  menuDate: z.iso.date().optional(),
  branchNote: text,
  cache: z.union([
    z.strictObject({
      status: z.literal("cached"),
      files: z
        .array(
          z.strictObject({
            path: cachePath,
            sourceUrl: url,
            capturedOn: z.iso.date(),
          }),
        )
        .min(1),
    }),
    z.strictObject({ status: z.literal("missing"), reason: text }),
  ]),
});
export const pricingSchema = z.strictObject({
  menuId: text,
  currency: z.literal("HUF"),
  basis: z.enum(["dine-in", "delivery", "takeaway", "unknown"]),
  coverage: z.enum(["complete", "partial"]),
  menuDate: z.iso.date().optional(),
  checkedOn: z.iso.date(),
  limitations: text.optional(),
  bowls: z
    .array(
      z.strictObject({
        name: text,
        price: money,
        eligibility: z.enum(["standard", "small", "combo", "extra", "promotion"]),
      }),
    )
    .min(1),
  evidence,
});
export type Pricing = z.infer<typeof pricingSchema>;
export function ramenPriceRange(pricing: Pricing) {
  if (pricing.basis !== "dine-in" || pricing.coverage !== "complete") return null;
  const prices = pricing.bowls
    .filter((bowl) => bowl.eligibility === "standard")
    .map((bowl) => bowl.price);
  if (!prices.length) return null;
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    currency: pricing.currency,
    checkedOn: pricing.checkedOn,
  };
}

export const researchSchema = z
  .strictObject({
    version: z.literal(1),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: text,
    brandId: text.optional(),
    publication: z.enum(["candidate", "listed"]),
    google: fact(
      z.strictObject({ rating: z.number().min(0).max(5), reviews: z.number().int().nonnegative() }),
    ).optional(),
    identity: z.strictObject({
      branch: fact(text),
      category: fact(z.enum(["ramen-specialist", "serves-ramen"])),
      address: fact(text),
      district: fact(text),
      coordinates: fact(
        z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
      ),
      maps: link,
    }),
    links: z.strictObject({
      website: link,
      instagram: link,
      facebook: link,
      menu: link,
      reservations: link,
      delivery: link,
      takeaway: link,
    }),
    features: z.strictObject({
      reservations: featureSchema,
      delivery: featureSchema,
      takeaway: featureSchema,
      tabletOrdering: featureSchema,
      kioskOrdering: featureSchema,
      qrOrdering: featureSchema,
      customization: featureSchema,
      vegetarianRamen: featureSchema,
      veganRamen: featureSchema,
      japaneseOwned: featureSchema,
      hungarianOwned: featureSchema,
      japaneseChef: featureSchema,
    }),
    food: z.strictObject({
      styles: fact(z.array(text).min(1)),
      brothAndToppings: fact(text),
      availability: fact(
        z.strictObject({
          kind: z.enum(["regular", "lunch-only", "selected-days", "seasonal", "occasional"]),
          details: text,
        }),
      ),
    }),
    visiting: z.strictObject({
      hours: fact(text),
      operatingStatus: fact(z.enum(["open", "temporarily-closed", "permanently-closed"])),
      serviceCharge: fact(
        z.union([
          z.strictObject({ type: z.literal("none") }),
          z.strictObject({
            type: z.literal("percentage"),
            amount: z.number().positive().max(100),
            applicability: text,
          }),
          z.strictObject({
            type: z.literal("fixed"),
            amount: money,
            currency: z.literal("HUF"),
            applicability: text,
          }),
        ]),
      ),
    }),
    menus: z.array(menuSchema),
    pricing: z.array(pricingSchema),
  })
  .superRefine((record, ctx) => {
    const ids = record.menus.map((menu) => menu.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", path: ["menus"], message: "Menu IDs must be unique" });
    record.pricing.forEach((prices, index) => {
      if (!ids.includes(prices.menuId))
        ctx.addIssue({
          code: "custom",
          path: ["pricing", index, "menuId"],
          message: "Pricing must reference a menu in this branch",
        });
    });
  });
export type RestaurantResearch = z.infer<typeof researchSchema>;
