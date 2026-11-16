# Orion

An independent branding studio website built with Astro, TypeScript, CSS and Motion.

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run check
npm test
npm run build
npm run preview
```

## Site features

- Responsive editorial layout in black only. There is no light theme or theme switch.
- The hero is the Orion banner image (`public/hero-banner.webp`). A link over its Get Started button goes to the contact section. The Projects button in the image does nothing because the site has no projects section yet.
- The wordmark (`public/orion-wordmark.webp` and `public/orion-wordmark-large.webp`) is the header logo and closes the page in the footer.
- Inline SVG iconography throughout navigation and content.
- Motion springs for the hero entrance, scroll reveals and mobile menu. They start from the current value, so a half-finished open or close can be reversed.
- Translucent header that gains depth once content scrolls under it, and a nav link that follows the section in view.
- Display type tightens as it grows and small labels loosen. Type sizes use rem so they follow the browser's text-size setting.
- Pricing is two pack cards with a cursor-following highlight. Mini costs $29 or 2,400 Robux. Core costs $49 or 5,000 Robux.
- Reduced-motion (short fades only), reduced-transparency and increased-contrast preferences are supported. Content stays visible without JavaScript.

The page intentionally contains no fabricated client case studies or invented contact address. The pack prices come from the studio. Add what each pack includes, verified portfolio material and the studio's real contact channel when those details are available.

## Past work

`/work` lists projects from `src/data/work.ts`. The array is empty, so the page shows a "coming soon" state. Add real projects there (name, service, year, summary, and an image in `public/work/`) when they exist.

## Admin panel

`/admin` is protected by Discord sign-in and only lets in one Discord user ID (`1366813770344829131`, or whatever `ADMIN_DISCORD_ID` is set to). From there you can edit the Mini and Core names, dollar and Robux prices, and what each pack includes, and turn maintenance mode on or off. Maintenance mode shows visitors a "back soon" page (HTTP 503). You still see the real site while signed in.

The site renders on the server (Astro with the Vercel adapter) and reads pack data from storage on each request.

### Set up Discord sign-in

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application** (or pick one).
2. Open **OAuth2**. Copy the **Client ID**, then **Reset Secret** to get the **Client Secret**.
3. Under **Redirects** add `https://orionstdio.vercel.app/api/auth/callback` (add each custom domain you use too) and `http://localhost:4321/api/auth/callback` for local work. Save.

The site only asks for the `identify` scope, so Discord shares your user ID, name and avatar and nothing else.

### Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run `supabase/schema.sql`. It creates one `site_data` table with row level security on and no policies, so the public anon key cannot read or write it.
3. Open **Project Settings > API** and copy the **Project URL** and the **service_role** key. The service role key is a secret. Only put it in Vercel's environment variables, never in git or in browser code.

### Set up Vercel

Under **Settings > Environment Variables** add:

- `DISCORD_CLIENT_ID` (`1571819912203075674`) and `DISCORD_CLIENT_SECRET`
- `SESSION_SECRET`, a long random string (`openssl rand -base64 32`)
- `SITE_URL`, `https://orionstdio.vercel.app`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase step
- `ADMIN_DISCORD_ID` only if the allowed user should change

Then redeploy and open `/admin`. See `.env.example` for local development. Without Supabase, local dev stores data in `.data/site.json`, which git ignores. Never commit `.env`.

### How it is protected

- Sign-in uses the authorization code flow with PKCE and a state check.
- The server fetches the user's ID from Discord with the token it just received, and only the allowed ID gets a session.
- Sessions are signed, HTTP-only cookies that last 8 hours. The ID is checked again on every request.
- Admin pages and `/api/admin/*` return a redirect or 401 without a valid session. Saves also require a same-origin request and valid input.
