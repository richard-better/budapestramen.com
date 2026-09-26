import type { Language } from "./guide";

export const defaultLanguage: Language = "en";

/**
 * Picks the guide language the visitor ranks highest in an Accept-Language
 * header. Regional variants match their base language (en-GB is English).
 */
export function preferredLanguage(acceptLanguage: string | null): Language {
  const ranges = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      const quality = q === undefined ? 1 : Number(q.slice(2));
      return { base: tag.trim().toLowerCase().split("-")[0], quality, index };
    })
    .filter(({ quality }) => Number.isFinite(quality) && quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { base } of ranges) {
    if (base === "en" || base === "hu") return base;
  }
  return defaultLanguage;
}
