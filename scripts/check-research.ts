import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";
import { researchSchema } from "../apps/web/src/lib/research-schema";
import { candidateListSchema } from "../apps/web/src/lib/candidate-schema";

const root = new URL("../research/restaurants/", import.meta.url);
const researchIds = new Set<string>();
const listed = new Set(
  (await readdir(new URL("../apps/web/src/content/restaurants/", import.meta.url)))
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => name.slice(0, -5)),
);
for (const directory of await readdir(root, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const base = await realpath(new URL(`${directory.name}/`, root));
  const record = researchSchema.parse(
    JSON.parse(await readFile(resolve(base, "research.json"), "utf8")),
  );
  if (record.id !== directory.name)
    throw new Error(`Research ID does not match directory: ${directory.name}`);
  researchIds.add(record.id);
  if (record.publication === "listed" && !listed.has(record.id))
    throw new Error(`Missing restaurant YAML for listed research: ${record.id}`);
  listed.delete(record.id);
  for (const menu of record.menus) {
    if (menu.cache.status !== "cached") continue;
    for (const file of menu.cache.files) {
      const path = await realpath(resolve(base, file.path));
      const info = await stat(path);
      if (!path.startsWith(`${base}${sep}menus${sep}`) || !info.isFile() || info.size === 0) {
        throw new Error(`Invalid menu cache: ${record.id}/${file.path}`);
      }
      if (file.path.endsWith(".html")) {
        const bytes = await readFile(path);
        const html = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString(
          "utf8",
        );
        if (
          /STRIPE_PUBLIC_KEY|MAPBOX_ACCESS_TOKEN|DATADOG_RUM_TOKEN|ANALYTICS_API_PUBLIC_KEY/.test(
            html,
          )
        )
          throw new Error(
            `Menu cache contains application configuration: ${record.id}/${file.path}. Save static menu content instead of the complete application page.`,
          );
      }
    }
  }
}
if (listed.size) throw new Error(`Missing research records: ${[...listed].join(", ")}`);
const discovery = candidateListSchema.parse(
  JSON.parse(await readFile(new URL("../research/candidates.json", import.meta.url), "utf8")),
);
for (const candidate of discovery.candidates) {
  if (candidate.researchId && !researchIds.has(candidate.researchId))
    throw new Error(`Missing research record for candidate: ${candidate.id}`);
}
console.log(
  `Restaurant research, menu caches and ${discovery.candidates.length} discovery entries validated.`,
);
