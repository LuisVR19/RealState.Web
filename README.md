# Thomas Mata S.A.: sitio público (Next.js)

This is the client-facing site from the Claude Design prototype, rebuilt in Next.js 16 (App Router) with TypeScript and connected to Supabase (project schema in `../supabase`).

```bash
cp .env.example .env.local   # fill in the Supabase URL, publishable key and REVALIDATE_SECRET
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production mode (the caching described below only applies here)
```

## Pages

| Route | Screen | Rendering |
| --- | --- | --- |
| `/` | Home page: search, types, recent listings, zones, team | Static, cached data (revalidates every minute or on demand) |
| `/propiedades` | Listing with map and filters. All filters live in the URL: `op`, `tipo`, `canton`, `pmin`, `pmax`, `hab`, `banos`, `parqueos`, `amin`, `amax`, `amen`, `q`, `orden`, `guardadas`, `pagina` | Static shell + results streamed per request from a shared cache |
| `/propiedades/[code]` | Property page (`ISF-0001`…) with per-property Open Graph metadata | Prerendered at build; new codes generated on first visit (ISR) |
| `/asesores/[id]` | Agent profile | Same as above |
| `/para-ti` | Signed-in client: matches (`get_client_matches`) and visits | Per request, with the user's session and RLS. Never cached |
| `/auth/callback` | Target of Auth emails (account confirmation, magic link) | Route handler |
| `POST /api/revalidate` | Cache invalidation for the panel or a DB webhook | Route handler, protected by a secret |

## Architecture

**Public data is shared, private data is per user.**

- `lib/data.ts`: public reads. Uses a cookie-less anon client (`lib/supabase/public.ts`) inside `"use cache"` with `cacheTag`. Thousands of visitors share one result, and Supabase gets one query per cache interval instead of one per visit. RLS for `anon` still decides what is visible: only published properties with images, and `agents_public` without emails.
  - Free-text search and the "saved" list are not cached. Arbitrary terms must not fill the cache, and the saved list depends on the user.
- `lib/account.ts`: private reads for `/para-ti`. Uses the cookie client (`lib/supabase/server.ts`), which verifies the JWT with `getClaims`. RLS limits every query to the client's own rows.
- `components/ui-provider.tsx`: the browser session (`onAuthStateChange`), the client's name, favorites and match count. Pages stay identical for everyone and therefore cacheable; the personal parts are filled in the browser.
- `proxy.ts`: refreshes the session cookies only on the routes that read the session on the server (`/para-ti` and `/propiedades?guardadas`). The rest of the site pays no per-request session check.
- **Writes:**
  - Favorites: browser client + RLS, optimistic UI.
  - Preferences: `rpc save_my_preferences`, atomic, `SECURITY INVOKER`.
  - Visit requests: the `requestVisit` Server Action (`app/actions.ts`). It validates input and calls `rpc request_visit`; the `prepare_visit` trigger re-validates everything and assigns the agent.
- **Query params** are parsed by `lib/search-params.ts` against closed lists. Numbers are clamped and the text is limited to 80 characters, so arbitrary values never reach the database or the cache.
- **Security headers** (X-Frame-Options, Referrer-Policy, HSTS, etc.) are set in `next.config.ts`.

## Keeping the cache fresh

When the panel saves a change, it should call:

```http
POST /api/revalidate
Authorization: Bearer <REVALIDATE_SECRET>
Content-Type: application/json

{ "tags": ["properties", "property:ISF-0001"] }
```

- Valid tags: `properties`, `agents`, `zones`, `amenities`, `property:<code>`.
- With no body, every tag is revalidated.
- Without this call, data refreshes on its own within about a minute (properties) or an hour (agents, zones, amenities).
- A Supabase Database Webhook on `properties` / `property_images` pointing to this endpoint is also an option.

## Code layout

- `lib/types.ts`: domain types (camelCase), derived from the generated DB enums.
- `lib/supabase/database.types.ts`: generated with Supabase (`supabase gen types`). Copy of `../types/database.types.ts`.
- `lib/format.ts`: formatting, labels, price presets and CR phone helpers.
- `lib/team.ts`: builds the general site contact (phone/WhatsApp, hours, location) from the owner's row (`agents.is_owner`, read by `getSiteContact()` in `lib/data.ts`). The owner edits it in the panel under Mi perfil.
- `app/styles/ds.css`, `app/globals.css`: design system and site styles.

## Pending

- **Captcha (Turnstile) or rate limiting on `requestVisit`.** Anyone can request visits. The Server Action is the single place to add it.
- **Password reset.** The flow is not in the UI yet (`/auth/callback` already accepts `type=recovery`).
- **"Search when moving the map".** The toggle was removed: it did nothing. `search_properties` already accepts a bounding box (`p_min_lat`…).
- **Auth settings in the Supabase dashboard.** Site URL, redirect URLs (`/auth/callback`), SMTP and email templates for the remote project.
  - **Confirm from another device.** Email links currently use PKCE (`?code=`), which only works in the browser where the user signed up. To support confirming from another device, change the templates to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/para-ti`. The route already accepts that format, and `next` is validated against open redirects.
- **Asymmetric JWT signing keys.** Check that the project uses them, so that `getClaims` verifies the session locally and does not make a network call to Auth on every request to `/para-ti`.
- **Free-text search at large volume.** Searches by zone or title run `unaccent(...) LIKE` without an index. That is fine for hundreds of properties; for thousands, add a `pg_trgm` index on an unaccented generated column.
