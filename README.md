# hogwartlegacy.github.io

A personal portfolio with a live 3D hero: a mountain lake with a castle on the far shore and a houseboat moored on the water, at golden hour or under the stars, rendered in WebGL with three.js. Everything in the scene is generated in the browser: the terrain, the spruces on the near shores, the castle, the boat, the mirrored lake, the sky, the clouds, the sun and moon. Nothing is downloaded except three.js itself.

Scroll down and the camera crosses the lake and goes aboard the boat. Its cabin is a gallery: each professional project hangs on the wall as a picture, and clicking one opens its story. The hero's name, role and bio are made of particles that scatter from the pointer and settle back. Dusk and night take turns by themselves.

Plain HTML, CSS and JavaScript. There is no build step and no framework.

## Make it yours

Almost everything personal lives in **`content.js`**: your name, role, bio, links, résumé, projects and the "How I work" cards. Edit it, save, and refresh.

- An empty value hides its element. For example, the LinkedIn pill only appears once `links.linkedin` is set, and the Contact pill once `email` is set.
- **Shelves** (`sections`) hold the projects. A shelf marked `gallery: true` is the one hung in the boat; give each of its projects `details` (the bullets in the story panel) and `stack` (the chips). Where the 3D scene can't run, that shelf shows on the page like the others.
- Projects take `cover: "assets/img/x.webp"` for a screenshot and `video: "assets/media/x.mp4"` for a loop that plays on hover. Without either, the card uses a drawn cover (`art`, see `assets/js/covers.js`). The pictures in the boat are the same drawn covers.
- Put a résumé PDF at `assets/resume.pdf` and set `links.resumePdf` to show a **Download PDF** button.

Link previews read the `<title>`, description and `og:` tags at the top of `index.html` before any script runs. Keep those in step with `content.js`. The preview image is `assets/img/og.jpg` (1200×630).

## Preview locally

The 3D scene is a JavaScript module, and browsers don't run modules from `file://`. Serve the folder instead:

- In VS Code, use the **Live Server** extension and choose *Open with Live Server*, or
- run `npx serve .` or `python -m http.server` in this folder and open the address it prints.

If you open `index.html` straight from disk, you'll see the 2D fallback scene instead of the 3D one, and the professional work as an ordinary shelf.

## Publish on GitHub Pages

1. Push this repository to `main`.
2. On GitHub, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, and choose `main` and `/ (root)`.
3. After a minute the site is live at <https://hogwartlegacy.github.io/>.

`.nojekyll` tells Pages to serve the files as they are. `404.html` is the page shown for unknown addresses.

## How it's built

| File | What it does |
|---|---|
| `content.js` | All personal content, as data |
| `assets/js/app.js` | Renders the content, and runs the theme (and its slow turn between dusk and night), the résumé sheet, filters, the scroll that drives the voyage, and the story panel |
| `assets/js/scene3d.js` | The WebGL hero: terrain, spruces, castle, houseboat and its gallery, the mirrored lake, sky shader, birds, fireflies, the camera and its voyage |
| `assets/js/particles.js` | The hero's words as particles that the pointer pushes aside |
| `assets/js/scene2d.js` | A 2D painting of the lake, used where WebGL 2 isn't available |
| `assets/js/covers.js` | Card art, drawn on canvas, animated on hover; also the pictures on the boat's wall |
| `assets/css/styles.css` | All styles: glass panes, two themes (dusk and night), responsive layout |
| `assets/vendor/three.module.min.js` | three.js r169 (MIT), served from this repository rather than a CDN |

Notes on the scene:

- **The mountains** are carved with eroded noise, so valleys stay smooth while ridges are sharp and broken. Light is baked into the ground as it's built: how much open sky each point sees, plus soft shadows. The shader adds crags, rock strata, a forest belt up to the tree line, and snow that only settles on gentler slopes.
- **The trees** are spruces built from drooping branch cards around a full-height trunk, with the needles drawn on a canvas at load time. They stand on the two near shores. In the breeze the whole tree leans, its trunk bends with the crown, and each branch bows on a beat of its own, most at the tip and not at all where it leaves the trunk, so branches and needles move together and stay attached.
- **The castle** is built from flat faces in code: a curtain wall with round towers, a gatehouse, a great hall, a chapel and a keep. The shader lays its stone in courses and lights the windows, most of them, more at night.
- **The boat** is lofted from a hull, with a cabin lit by pendants and a picture light over each frame. The pictures are the projects' drawn covers, painted onto textures; the one in front of the camera keeps playing. Scrolling is the camera: out over the water, aboard through the door, then a stop at each picture. To go straight in, click the boat, the cue under the hero (*Step aboard*), the nav's *Work*, or the button that appears on the way; the page then scrolls itself in, and any wheel, key or touch hands it back. A picture under the pointer lights up; a click opens its story. The same pictures are also buttons for keyboards and screen readers, and *Skip the tour* jumps past all of it.
- **The lake** is a real mirror. Each frame, a second camera renders the world from below the waterline, and the water shader samples that image through ripples carried on a flowing current. Inside the cabin the mirror pass and the outdoors are skipped.
- **Theme:** the moon button (or a click on the sun) switches between dusk and night, and the light also turns by itself about every half minute, over nine seconds. The sun sets behind the range and the moon rises over the massif. Your own choice is remembered for the next visit.
- **Particles:** the name, role and bio are sampled from the text as the page sets it, so they follow any layout. The real text stays in the page for screen readers, selection and search.
- **Low-power devices:** the scene lowers its resolution when frames run slow, and draws only a few frames a second once the page scrolls past it.
- **Reduced motion:** visitors with *reduce motion* switched on get a single still frame, plain text, no voyage (the work is a shelf), and no automatic day and night.

## Credits

[three.js](https://threejs.org) (MIT) · [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) and [Geist](https://vercel.com/font) (OFL) · icons after [Lucide](https://lucide.dev) (ISC)
