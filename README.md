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

`/admin` is protected by Google sign-in and only lets in the one account named in `ADMIN_EMAIL`. From there you can edit the Mini and Core names, dollar and Robux prices, and what each pack includes, and turn maintenance mode on or off. Maintenance mode shows visitors a "back soon" page (HTTP 503). You still see the real site while signed in.

The site renders on the server (Astro with the Vercel adapter) and reads pack data from storage on each request.

### Set up Google sign-in

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project (or pick one).
2. Go to **APIs & Services > OAuth consent screen** (called **Google Auth Platform** in newer consoles). Choose **External**, fill in the app name and your email, and save. Leave it in Testing and add your own Google account as a test user.
3. Go to **Credentials > Create credentials > OAuth client ID**. Application type: **Web application**.
4. Under **Authorized redirect URIs** add `https://orionstdio.vercel.app/api/auth/callback` (use your real domain, and add each custom domain you use) and `http://localhost:4321/api/auth/callback` for local work.
5. Copy the client ID and client secret.

### Set up Vercel

1. In the Vercel project, open **Storage** (or the Marketplace) and add an **Upstash Redis** database. Connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
2. Under **Settings > Environment Variables** add:
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from step 5 above
   - `ADMIN_EMAIL`, the Google account allowed in
   - `SESSION_SECRET`, a long random string (`openssl rand -base64 32`)
   - `SITE_URL`, for example `https://orionstdio.vercel.app`
3. Redeploy, then open `/admin`.

See `.env.example` for local development. Without Redis, local dev stores data in `.data/site.json`, which git ignores. Never commit `.env`.

### How it is protected

- Sign-in uses the authorization code flow with PKCE and a state check.
- The server only accepts a verified email from Google, issued to this app, that matches `ADMIN_EMAIL`.
- Sessions are signed, HTTP-only cookies that last 8 hours. The email is checked again on every request.
- Admin pages and `/api/admin/*` return a redirect or 401 without a valid session. Saves also require a same-origin request and valid input.
