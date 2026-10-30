# karthic-sample-portfolio

A standalone copy of the interactive Three.js room, with sample identity,
neutral avatar artwork, and placeholder portfolio records. Movement, lighting,
recorded sounds, designed books, certificate viewers and the moving cleaning
robot are preserved.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. Run `npm test` for movement checks and
`npm run build` to generate `dist/`.

## Personalize

| File | Replace |
| --- | --- |
| `profile.js` | Name, initials, role, phone, and room-reader identity |
| `index.html` | Matching introduction, about/contact panels, links, location and SEO |
| `project-data.js` | Five project names, summaries, results, links and technologies |
| `books.js` | Ten skill-book titles and experience notes |
| `wall-decor.js` | Education, organization, dates and achievement placeholders |
| `vacuum-data.js` | Sixth project: hardware case study and subsystem descriptions |
| `public/images/` | Neutral avatar, icons, social preview and hardware diagram |
| `public/textures/book-cover.svg`, `book-inner.svg` | Desk-book cover and introduction artwork |
| `live.js` | Fictional code displayed on the monitor |
| `wrangler.jsonc`, `public/sitemap.xml` | Your deployment name and domain |

All contact and project URLs use `example.com`; the phone number is deliberately
non-routable. The SEO data describes a template, with indexing disabled. Before
publishing, set your real URLs and replace the noindex directive and robots rules.
No real person's photo, contact details, education, project achievements, original
domain redirects, Git history, deployment bindings or account credentials are
included in this copy. Generic reference-library notes remain as decorative content.

## Features

Each visit starts at night. Toggle the wall switch or Lights button to light the
room. Drag to look, use WASD to walk, Q/E to turn, and scroll or pinch to zoom.
Tap a clear floor area to walk there. Panels, books, certificates and the robot
are interactive. Reduced motion is respected, and sound can be muted.

The robot opens the sample sixth project and pauses around the visitor, moved
furniture, and open panels. All five framed project records share the same
editable certificate template. The shelf contains 94 designed books.

## Deployment

`npm run build` creates a static Vite build. The optional Cloudflare Worker in
`src/worker.js` serves those files without redirecting to any external domain.
Choose your own account, project name and hostname before deploying. Nothing is
automatically published by creating this folder.

## Credits

Room geometry is based on Sushil Thapa's open-source 3d-portfolio.
Third-party font/decoder notices and the CC0 sound-source credits in
`public/audio/CREDITS.md` are retained.
