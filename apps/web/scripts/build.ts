import "../../../scripts/check-research";
import { distilledCloudflare } from "@alchemy.run/frontend-frameworks/astro/cloudflare";
import { build } from "astro";

await build({
  integrations: [distilledCloudflare()],
});
