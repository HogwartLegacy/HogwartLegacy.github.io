# hogwartlegacy.github.io

A personal portfolio with a live 3D hero: a mountain lake at golden hour, or under the stars, rendered in WebGL with three.js. Everything in the scene is generated in the browser: the terrain, nearly 4,000 pines, the mirrored lake, the sky, the clouds, the sun and moon. Nothing is downloaded except three.js itself.

Plain HTML, CSS and JavaScript. There is no build step and no framework.

## Make it yours

Almost everything personal lives in **`content.js`**: your name, role, bio, links, résumé, projects and the "How I work" cards. Edit it, save, and refresh.

- An empty value hides its element. For example, the LinkedIn pill only appears once `links.linkedin` is set, and the Contact pill once `email` is set.
- Résumé entries marked as placeholders (`Company name`, `Degree, Field`) are there to show the layout. Replace them with your own.
- Projects take `cover: "assets/img/x.webp"` for a screenshot and `video: "assets/media/x.mp4"` for a loop that plays on hover. Without either, the card uses a drawn cover (`art`).
- Put a résumé PDF at `assets/resume.pdf` and set `links.resumePdf` to show a **Download PDF** button.

Link previews read the `<title>`, description and `og:` tags at the top of `index.html` before any script runs. Keep those in step with `content.js`. The preview image is `assets/img/og.jpg` (1200×630).

## Preview locally

The 3D scene is a JavaScript module, and browsers don't run modules from `file://`. Serve the folder instead:

- In VS Code, use the **Live Server** extension and choose *Open with Live Server*, or
- run `npx serve .` or `python -m http.server` in this folder and open the address it prints.

If you open `index.html` straight from disk, you'll see the 2D fallback scene instead of the 3D one.

## Publish on GitHub Pages

1. Push this repository to `main`.
2. On GitHub, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, and choose `main` and `/ (root)`.
3. After a minute the site is live at <https://hogwartlegacy.github.io/>.

`.nojekyll` tells Pages to serve the files as they are. `404.html` is the page shown for unknown addresses.

## How it's built

| File | What it does |
|---|---|
| `content.js` | All personal content, as data |
| `assets/js/app.js` | Renders the content, and runs the theme, résumé sheet, filters and scroll veil |
| `assets/js/scene3d.js` | The WebGL hero: terrain, forest, the mirrored lake, sky shader, birds, fireflies, camera |
| `assets/js/scene2d.js` | A 2D painting of the same scene, used where WebGL 2 isn't available |
| `assets/js/covers.js` | Card art, drawn on canvas and animated on hover |
| `assets/css/styles.css` | All styles: glass panes, two themes (dusk and night), responsive layout |
| `assets/vendor/three.module.min.js` | three.js r169 (MIT), served from this repository rather than a CDN |

Notes on the scene:

- **The lake** is a real mirror. Each frame, a second camera renders the world from below the waterline, and the water shader samples that image through animated ripples.
- **Theme:** the moon button (or a click on the sun) switches between dusk and night. The sun sets behind the range and the moon rises over the massif. The choice is remembered.
- **Low-power devices:** the scene lowers its resolution when frames run slow, and draws only a few frames a second once the page scrolls past it.
- **Reduced motion:** visitors with *reduce motion* switched on get a single still frame.

## Credits

[three.js](https://threejs.org) (MIT) · [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) and [Geist](https://vercel.com/font) (OFL) · icons after [Lucide](https://lucide.dev) (ISC)
