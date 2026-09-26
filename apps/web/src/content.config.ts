import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { restaurantSchema } from "./lib/restaurant-schema";

export const collections = {
  restaurants: defineCollection({
    loader: glob({ pattern: "*.yaml", base: "./src/content/restaurants" }),
    schema: restaurantSchema,
  }),
};
