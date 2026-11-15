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
- Pricing explained as a tailored scoping process rather than invented fixed rates.
- Pricing is three step cards (scope, proposal, start work) with a cursor-following highlight.
- Reduced-motion (short fades only), reduced-transparency and increased-contrast preferences are supported. Content stays visible without JavaScript.

The page intentionally contains no fabricated client case studies, sample package prices, or invented contact address. Add verified portfolio material and the studio's real contact channel when those details are available.
