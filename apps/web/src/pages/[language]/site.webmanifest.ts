import type { APIRoute } from "astro";

export const GET: APIRoute = ({ params }) => {
  const language = params.language;
  if (language !== "en" && language !== "hu") return new Response("Not found", { status: 404 });
  return new Response(
    JSON.stringify({
      id: `/${language}`,
      name: "Budapest Ramen",
      short_name: "Budapest Ramen",
      lang: language,
      start_url: `/${language}`,
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
};
