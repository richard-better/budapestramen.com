import type { APIRoute } from "astro";
import { preferredLanguage } from "../lib/language";

export const GET: APIRoute = ({ request, url }) => {
  const language = preferredLanguage(request.headers.get("accept-language"));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${language}${url.search}`,
      Vary: "Accept-Language",
    },
  });
};
