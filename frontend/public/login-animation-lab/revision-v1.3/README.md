<!-- Explains how to preview and verify the isolated MECHA Login Revision v1.3. -->
# MECHA Login Design Revision v1.3

This standalone prototype explores the selected Soft Cinematic Transition around the approved Employee ID Card. It does not load React source, shared mock data, backend routes, or authentication code. The Dashboard behind the modal is illustrative and local to this page.

## Open the prototype

With the existing frontend preview server running, open:

`http://localhost:3001/PROJECT-MANAGEMENT/login-animation-lab/revision-v1.3/index.html`

The prototype uses the approved Outfit typeface and keeps the 340 × 214 px card geometry. At narrow widths the card scales proportionally. Type into Employee ID to update the card immediately. Use EMP-001 through EMP-008 with any non-empty password to play the demo. A complete unknown ID such as EMP-999 shows the not-found state; partial IDs remain a partial preview. Show/Hide Password, Remember me, Forgot password, Escape, and replay are local interactions. Nothing is sent or saved; the completion note says that no session was created.

## Video reference match

The combined experience follows the two selected local references:

- Animation: `evidence/concept-a-complete-animation.mp4` (the requested `revision-v1.3/concept-a.mp4` filename is not present).
- Live typing: `evidence/realtime-employee-id-typing.mp4`.

The animation reference is 2.96 seconds at 1440 × 1000. Samples at 250 ms intervals show: 0.00s initial modal and placeholder; 0.25s completed `EMP-001` lookup; 0.50s loading response; 0.75s form fade and card travel; 1.00–1.25s card arriving at center; 1.25–1.75s preview taking over the modal; 1.75–2.25s Welcome overlay; 2.50s modal/dashboard crossfade; and 2.75s Dashboard mostly clear. The 1.28-second typing reference shows the input and card advancing together through `E`, `EM`, `EMP-`, `EMP-0`, `EMP-00`, and `EMP-001`; employee details appear with the complete valid ID. These are sampled timestamps, not frame-accurate edit points.

The implementation uses the same fixed card, live field updates, form fade, centered card movement, preview expansion, Welcome overlay, and final Dashboard reveal. It retains local demo data only, and the completion notice states that no session was created.

## Animation

The Sign In response shows a short loading state. The form then fades while the card travels to the modal center. A quiet preview light field opens around the card as one navy-to-blue cinematic surface covers the two original panels, keeping the Welcome copy legible. The password preview fades before the employee name appears. A clear illustrative Dashboard crossfades in as the modal dissolves. Movement uses transform and opacity; the card itself does not resize. Reduced-motion preference skips the card travel, panel motion, reflection, and checkmark drawing while keeping the success-demo stages readable.

## Verify and capture

Run from `frontend/` on a machine with the frontend preview server, Chromium, Node, and ffmpeg available:

```sh
LOGIN_REVISION_URL=http://localhost:3001/PROJECT-MANAGEMENT/login-animation-lab/revision-v1.3/index.html \
  node public/login-animation-lab/revision-v1.3/verify.mjs
```

The script opens a visible Chromium window, checks all eight demo IDs, partial and unknown states, responsive geometry, the full animation, replay, reduced motion, and absence of API requests. Each run creates a new `evidence/video-reference-run-<timestamp>-<pid>/` directory for screenshots, screen recordings, and `verification.json`. It does not write to the source-video files in `evidence/`.

## Evidence

- `evidence/empty-placeholder.png`
- `evidence/partial-employee-id.png`
- `evidence/valid-employee-id.png`
- `evidence/employee-not-found.png`
- `evidence/desktop-cinematic-preview.png`
- `evidence/mobile-cinematic-preview.png`
- `evidence/concept-a-preview-expansion.png`
- `evidence/concept-a-welcome.png` (selected from the recorded Welcome stage)
- `evidence/concept-a-welcome.jpg` (matching JPEG copy)
- `evidence/realtime-employee-id-typing.mp4`
- `evidence/concept-a-complete-animation.mp4`
- `evidence/verification.json`

The videos are Chromium screencast captures encoded after playback. The prototype is an interaction and visual review artifact; requestAnimationFrame callback timing is not compositor-presented frame telemetry.
