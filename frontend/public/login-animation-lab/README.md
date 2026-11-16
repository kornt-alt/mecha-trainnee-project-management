<!-- Documents how to run and review the isolated login motion experiments. -->
# MECHA Login Animation Lab

This folder is an isolated preview based on the approved HTML reference. The React Login components, application routes, shared styles, authentication, and demo data remain untouched.

The existing frontend server must be running at `http://localhost:3000/PROJECT-MANAGEMENT/` so the preview can show the live Dashboard behind its login surface. Open one of these URLs:

- `http://localhost:3000/PROJECT-MANAGEMENT/login-animation-lab/index.html?concept=a` — Soft Cinematic
- `http://localhost:3000/PROJECT-MANAGEMENT/login-animation-lab/index.html?concept=b` — Layered Reveal
- `http://localhost:3000/PROJECT-MANAGEMENT/login-animation-lab/index.html?concept=c` — Seamless Morph

All three use the same approved form, card, typography, and responsive layout. The password is demo-only. Use `EMP-001` through `EMP-008` with any non-empty password. The completion notice explicitly says that no session was created. The visible **Replay login demo** button resets the experiment.

## Motion

| Concept | Motion treatment | Easing and timing |
|---|---|---|
| A | Form fades as the card glides to modal center; the existing blurred Dashboard sharpens while the modal dissolves. | Card: 620 ms `cubic-bezier(.22,.61,.36,1)`; Dashboard and dissolve: 760/520 ms. |
| B | Card stays in place; a static backdrop-blur layer fades from the ready Dashboard before the modal dissolves. | Form: 460 ms ease; blur layer: 760 ms ease; modal dissolve starts 220 ms later. |
| C | Card glides to center; a growing circular clear aperture reveals the Dashboard from the card while the modal dissolves. | Aperture: 1050 ms `cubic-bezier(.22,.61,.36,1)`; dissolve starts 220 ms later. |

Each page honors `prefers-reduced-motion`. Prototype files and captured evidence are all contained in this folder. No dependencies are added.

## Captures

On the Raspberry Pi desktop, run `node public/login-animation-lab/measure.mjs --runs=5` from `frontend/`. It launches a separate, visible Chromium instance with a temporary profile, measures five runs per concept, then records each concept once with a continuous screencast. The harness selects stage stills from those recorded frames using Chromium stage signals, so screenshot calls do not interrupt the animation. The stable initial still is captured before playback. Evidence and JSON are saved under `public/login-animation-lab/evidence/`. The capture harness does not use headless Chromium.

If a browser cannot launch on the current display, set `CHROMIUM_BIN` to the installed Chromium executable and confirm `DISPLAY`/Wayland are available. The harness requires the system `ffmpeg` for MP4 recordings; screenshots and measurements do not require it.
