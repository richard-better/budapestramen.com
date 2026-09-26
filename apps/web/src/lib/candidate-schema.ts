import { z } from "zod";

const text = z.string().trim().min(1);
const url = z.url({ protocol: /^https?$/ });
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const candidateListSchema = z
  .strictObject({
    version: z.literal(1),
    checkedOn: z.iso.date(),
    scope: text,
    coverage: z.strictObject({
      complete: z.boolean(),
      sources: z.array(url).min(1),
      limitations: z.array(text),
    }),
    candidates: z
      .array(
        z.strictObject({
          id,
          name: text,
          researchId: id.optional(),
          status: z.enum(["candidate", "needs-menu-check", "needs-branch-check", "closed"]),
          address: text.nullable(),
          mapsUrl: url.nullable(),
          orderingUrl: url.optional(),
          signals: z
            .array(
              z.enum([
                "maps-search-match",
                "ramen-name-or-category",
                "ramen-mention",
                "editorial-ramen-mention",
                "delivery-category-match",
                "official-menu-ramen",
                "official-closure-notice",
                "official-directory-match",
              ]),
            )
            .min(1),
          sources: z.array(z.strictObject({ url, checkedOn: z.iso.date(), note: text })).min(1),
          followUp: z.array(text).min(1),
        }),
      )
      .min(1),
  })
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.candidates.forEach((candidate, index) => {
      if (seen.has(candidate.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["candidates", index, "id"],
          message: "Duplicate candidate ID",
        });
      }
      seen.add(candidate.id);
    });
  });
