# budapestramen.com

The guide lives at `/en` and `/hu`. Restaurants have stable paths such as
`/en/ramen-ya/ramenka` and `/hu/ramen-ya/ramenka`. The bare domain `/` redirects
(302, `Vary: Accept-Language`) to whichever of English or Hungarian ranks higher in
the browser's `Accept-Language` header, defaulting to English, and keeps the query
string. From then on the URL is the source of truth for language, selected restaurant,
filters, map/list view, map position, and open panels. For example:

```text
/hu/ramen-ya/ramenka?directions=1
/en?style=Tonkotsu&vegan=1&view=list
/hu?panel=filters&recommended=1
/en/ramen-ya/nemramen?preview=1
```

Browser back/forward restores the guide. Map gestures replace the current history
entry so a pan does not create a trail of Back steps. Location permission and the
user's distance-sorting origin stay in memory; they are never added to shared URLs.

## Restaurant content

Edit one YAML file per restaurant in `apps/web/src/content/restaurants/`. The file
name is its permanent URL slug. Shared facts live once; recommendations have `en`
and `hu` translations. Each listing includes map and menu links, coordinates,
address, ramen styles, and dietary details.

Astro loads the files through the `restaurants` content collection. Its Zod schema
in `apps/web/src/lib/restaurant-schema.ts` validates coordinates, ramen styles,
map and menu links, ratings, and both recommendation translations. Run
`bun run check` and `bun run build` after editing. Adding a valid YAML file adds a
restaurant to both language routes, the map, and the list without editing
application code.

The four current listings, ramen styles, ratings, and map and menu links were
gathered from Google Maps and linked restaurant menus on September 26, 2026.
`source.date` records when the details were checked; ratings and review counts can
change. The guide links to Google Maps for photos and reviews instead of
publishing empty photo slots or placeholder links.

Interface translations live in `apps/web/src/lib/translations.ts`. The map uses
Leaflet with OpenFreeMap's Bright vector style, rendered by MapLibre GL. Map
attribution is read from the style and shown in Leaflet's attribution control.
Fonts are hosted locally. No API key or database is required.

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Astro, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Astro** - The web framework for content-driven websites
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Vite+** - Unified Vite toolchain, workspace task runner, linting, and formatting

## Getting Started

Use Bun 1.4.2 (pinned in `package.json` and `mise.toml`) and Node 22.15 or newer. Bun 1.3.7 crashed during an Alchemy deployment on macOS; 1.4.2 completed the same deployment successfully. With mise, run `mise install` first.

Install the dependencies:

```bash
bun install --frozen-lockfile
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:4321/en](http://localhost:4321/en) or
[http://localhost:4321/hu](http://localhost:4321/hu) in your browser to see the guide.

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `bun run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

For Cloudflare, Alchemy loads and validates deployment inputs with `varlock/auto-load` in its Node/Bun deployment process. Worker code reads native bindings; web clients use the framework's public env API through `src/env.public.ts` where needed. Alchemy supplies resource URLs and managed database credentials. In-Worker Varlock protections are deferred until an official Alchemy integration is available; see [the non-Wrangler deployment guidance](https://varlock.dev/integrations/cloudflare/#non-wrangler-deploy-tools-alchemy-sst-pulumi).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Deployment

The site runs on **Cloudflare Workers**, deployed by [Alchemy](https://alchemy.run/cloudflare/frontend/astro/). Alchemy builds Astro, uploads its static assets and server bundle, and manages the session KV namespace and Images binding in `packages/infra/alchemy.run.ts`.

### Automatic deployments

[Deploy to Cloudflare](https://github.com/richard-better/budapestramen.com/actions/workflows/deploy.yml) runs on every push to `main`. It installs the committed Bun lockfile, checks formatting/lint/types, builds the Worker locally, then deploys the `production` stage. Pull requests to `main` run the same checks and build without receiving deployment credentials or deploying. You can also run the workflow manually on `main` from GitHub Actions.

Production deployments are serialized so two runs cannot update Alchemy's state simultaneously. The `production` GitHub environment records deployment history. Alchemy prints the site's `workers.dev` URL as the `web` output in the deployment log.

### One-time Cloudflare setup

1. In the Personal Cloudflare account, open **Manage account > Account API tokens** and create a custom token named `budapestramen-github-actions`. Give it these account permissions:
   - Workers Scripts: Edit
   - Workers KV Storage: Edit
   - Account Settings: Read
   - Secrets Store: Edit
2. Copy that account's **Account ID** from Cloudflare's Workers & Pages overview.
3. Configure this repository's [Actions secrets and variables](https://github.com/richard-better/budapestramen.com/settings/secrets/actions):

   | Kind     | Name                    | Value                     |
   | -------- | ----------------------- | ------------------------- |
   | Secret   | `CLOUDFLARE_API_TOKEN`  | The custom API token      |
   | Variable | `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account ID |

   Alternatively, use the GitHub CLI from the repository root. The secret command prompts for the token without including it in your command history:

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   gh variable set CLOUDFLARE_ACCOUNT_ID --body YOUR_ACCOUNT_ID
   ```

4. Push to `main`, or use **Actions > Deploy to Cloudflare > Run workflow** after adding the credentials.

The first production deployment also creates Alchemy's remote state-store Worker, backed by a SQLite Durable Object, and stores its authentication and encryption keys in Cloudflare Secrets Store. Later local and CI deployments share that state. No GitHub state cache or `ALCHEMY_PASSWORD` is needed. Keep the state store and the `production` stage name stable. See [Alchemy's CI documentation](https://alchemy.run/environments/ci/) for the Secrets Store permission requirement.

### Local commands

```bash
bun run check              # Formatting, lint, and types
bun run build              # Build for Workers without Cloudflare credentials
bun run deploy:production  # Build and deploy the same stage as GitHub Actions
```

For local deployments, configure a Cloudflare profile once:

```bash
cd packages/infra
bunx alchemy profile edit --add Cloudflare
```

Alternatively, put `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the ignored `packages/infra/.env` file. The production command approves Alchemy's deployment plan automatically; to inspect it first, run `bun run deploy:production --dry-run`. Alchemy builds again during deployment using the actual Worker bindings.

`bun run deploy` uses Alchemy's personal stage by default. `bun run destroy` removes the selected stage's resources; production is always selected explicitly.

### Custom domain

Production is served at [https://budapestramen.com](https://budapestramen.com). The domain is attached to `budapestramen-com-web-production-kdmhm5washrowgrt` in the Personal Cloudflare account. Cloudflare manages its DNS record and TLS certificate.

The zone's **Canonical HTTPS domain** redirect rule sends HTTP and `www.budapestramen.com` requests to `https://budapestramen.com`, preserving paths and query strings. The `www` DNS record must remain proxied so Cloudflare can apply this rule.

Manage the attachment in the Worker's [Domains tab](https://dash.cloudflare.com/b330197c84e64a1a154fa5f6eefa0fc6/workers/services/view/budapestramen-com-web-production-kdmhm5washrowgrt/production/domains). Alchemy's `domain` property is intentionally omitted from `packages/infra/alchemy.run.ts`, which preserves dashboard-managed domain attachments during deployments. The GitHub deployment token does not need zone permissions for this setup.

To reconnect the domain if the Worker is recreated, open its **Domains > Add Domain** action, select `budapestramen.com`, leave the subdomain empty, and select **Production**. Remove conflicting web-hosting records first; preserve email and verification records.

## Git Hooks and Formatting

- Optional native Vite+ hooks: `bun run hooks:setup`
- Docs: [Vite+ commit hooks](https://viteplus.dev/guide/commit-hooks)
- Run checks: `bun run check`

## Project Structure

```
budapestramen.com/
├── apps/
│   ├── web/         # Frontend application (Astro)
├── packages/
│   ├── infra/       # Cloudflare resources and deployment commands
│   └── config/      # Shared TypeScript configuration
└── .github/workflows/deploy.yml
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build the Astro Worker locally without deploying
- `bun run deploy:production`: Build and deploy to Cloudflare's production stage
- `bun run dev:web`: Start only the web application
- `bun run check-types`: Check TypeScript types across all apps
- `bun run check`: Run Vite+ format/lint checks and workspace TypeScript checks
- `bun run lint`: Run Vite+ lint checks
- `bun run format`: Run Vite+ formatting
- `bun run staged`: Run Vite+ checks against staged files
- `bun run hooks:setup`: Install Vite+ native Git hooks with `vp config`
