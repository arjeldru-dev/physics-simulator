# Project Specification: Mirror Room

## 1. Executive Summary
- **Product:** Mirror Room — A zero-dependency, local physics sandbox demonstrating the law of reflection.
- **Problem:** Physics teachers and students need a simple, visual, and highly responsive way to demonstrate and explore light reflection without getting bogged down in complex physics engine UI or equations.
- **Solution:** A highly constrained, vanilla JS canvas application running locally from an `index.html` file, allowing users to playfully discover optics principles by dragging a light source and drawing mirror segments.
- **Platform:** Web (Local Desktop HTML file)
- **Target Launch:** MVP (Weekend Project / Hackathon scale)
- **Scope:** MVP

## 2. User Personas & Workflows
- **Physics Teacher** — Educator presenting to a classroom
  - **Primary goal:** To visually prove that the angle of incidence equals the angle of reflection and demonstrate emergent properties of light in an enclosed space.
  - **Key workflow:** Opens the `index.html` file right before class. Starts with a blank dark canvas. Draws a few mirror segments. Drags the light source around in real-time to show how the light trap manipulates the rays. Uses the "Clear All" button to reset for the next demonstration.
  - **Frequency:** Weekly during relevant curriculum blocks.
  - **Pain points:** Most educational simulators are overly complex, require internet access, or have clunky, laggy UIs.

- **Student** — Learner exploring independently
  - **Primary goal:** To play, build "cool shapes" (kaleidoscopes, light traps), and intuitively absorb the physics rules through cause and effect.
  - **Key workflow:** Opens the file, draws lots of mirrors randomly, drags the light around to see the laser patterns, deletes a few mirrors using the keyboard, and watches exactly how the rays react.
  - **Frequency:** One-off or occasional exploration.
  - **Pain points:** If it's not instantly responsive or fun, they lose interest.

## 3. Feature Specification

### MVP Features (Must Ship)
- **The Empty Canvas**
  - Description: A full-screen or large fixed-ratio area to act as the simulation space.
  - User story: "As a user, I want a distraction-free area to draw and experiment."
  - Inputs: Mouse clicks and drags.
  - Outputs: Visual rendering of rays and mirrors.
  - Edge cases: Window resizing handling.

- **Draggable Light Source**
  - Description: A visible node that emits 36 distinct rays in a 360-degree spread.
  - User story: "As a teacher, I want to click and drag the light source so students can see real-time updates to the reflection angles."
  - Inputs: Mouse down, drag, mouse up.
  - Outputs: Source position updates; entire ray simulation recalculates at 60fps.
  - Business rules: 36 rays minimum. Fades out based on distance (opacity mapping to path length).

- **Draw Mirror Segments**
  - Description: Left-click and drag on the canvas to draw a flat 2D line segment acting as a mirror.
  - User story: "As a user, I want to quickly draw walls/mirrors."
  - Inputs: Click origin point (x1, y1), drag, release end point (x2, y2).
  - Outputs: A solid line appears. Future rays will now collide with it.
  - Business rules: Cannot have zero length.

- **Ray Tracing & Reflection Engine**
  - Description: The core math loop calculating segment intersections and reflecting vectors.
  - User story: "As a physics student, I need the light to accurately obey reflection laws."
  - Business rules: Ray intersects the *nearest* mirror. Angle of incidence = angle of reflection. Max 8 bounces per ray.
  - Edge cases: Ray perfectly hitting a vertex/corner (requires epsilon offset to prevent getting stuck in the wall).

- **Delete Mirror**
  - Description: Remove a specific mirror segment if a mistake is made.
  - User story: "As a user, I want to delete a single mirror without wiping the whole canvas."
  - Inputs: Hover over a line segment (highlight it) + press `Backspace` or `Delete` key.
  - Business rules: Requires a proximity check between mouse coordinates and line segment.

- **Clear All UI**
  - Description: A single UI button bounding the canvas.
  - User story: "As a teacher, I want to securely wipe the board for the next example."
  - Inputs: Click.
  - Outputs: Canvas array of mirrors is emptied. 

### V1.1 Features (Next Release)
- Adjustable UI sliders for Ray count (e.g., dial down to 1 ray, or up to 360).
- Toggle for "Show Normals" (draws a faint dashed perpendicular line at the bounce impact point to explicitly show the math).

### Anti-Features (Explicitly Out of Scope)
- No server, database, or cloud saving.
- No complex optical tools (e.g., no curved lenses, refraction, prisms, or variable indices of refraction). It is mirrors *only*.

## 4. Technical Architecture

### Stack
| Layer | Technology | Justification |
|---|---|---|
| Frontend | Vanilla JS (ES6) | ~100 lines target, no build steps required. |
| Rendering | HTML5 `<canvas>` | Perfect for 2D line drawing, fast clear/redraw loops. |
| Styling | Vanilla CSS | Kept in `<style>` tag in the `index.html` for a single-file portable app. |

### System Architecture
The application runs entirely in the browser using a `requestAnimationFrame` loop. 
- **State:** `mirrors` (array of `{x1,y1,x2,y2}`), `lightSource` (`{x,y}`).
- **Update Loop:** Clears canvas -> Draws mirrors -> Calculates 36 rays from light -> Performs line-line intersections for collisions -> Draws ray paths with gradient/opacity fading.

### Critical Math/Algorithms
- **Intersection:** 2D Line-segment to Line-segment intersection.
- **Reflection:** Normalizing the segment vector, finding the perpendicular normal, and reflecting the incoming ray vector `R = D - 2(D·N)N`.

## 5. Design Direction
- **Aesthetic:** "Neon Blackboard". Dark, high-contrast, glowing.
- **Color palette:** 
  - Canvas: `#111111` (Very dark gray/black)
  - Mirrors: `#FFFFFF` (Solid white, maybe slight thickness)
  - Light Source: `#FFEA00` (Bright yellow/gold glowing dot)
  - Rays: `#FFEA00` with decreasing `rgba()` opacity over distance.
- **Typography:** Sans-serif (system defaults like Inter, San Francisco, or Segoe UI) for simple UI overlay.

## 6. Security & Compliance
- **Security tier:** Local / Offline mode. No data collection, zero network requests. Safe for school environments out of the box.

## 7. Infrastructure & DevOps
- **Deployment strategy:** None. It is a portable `index.html` file. Can optionally be dropped into Vercel/GitHub Pages as a static file later if public hosting is desired.

## 8. Project Phases & Milestones

| Phase | Focus | Duration | Key Deliverables |
|---|---|---|---|
| 0 | Scaffolding | 1 Hour | Empty `index.html` with full-screen Canvas and resizing logic. |
| 1 | Interaction State | 1 Hour | Mouse event listeners for dragging the light source and drawing/storing mirrors. |
| 2 | The Physics Engine | 2 Hours| Line intersection math and 8-bounce reflection loop. |
| 3 | Rendering & Polish | 2 Hours| Drawing the fading rays, adding hover-to-delete logic, glowing CSS effects. |

## 9. Open Questions & Risks
- **Hit Detection for Deletion:** Hovering over a 1px line segment to delete it is notoriously fiddly in canvas.
  - *Mitigation:* Use distance-to-line math with a generous padding (e.g., 10-15px threshold) and highlight the line when within range so the user knows it's active for deletion.
- **Performance:** 36 rays * 8 bounces = up to 288 line intersection checks per frame *against every mirror drawn*.
  - *Mitigation:* At normal human-drawn mirror counts (1-50), Vanilla JS will handle this easily at 60fps. No spatial partitioning is needed yet.

## 10. Success Metrics
- Performance: Maintains solid 60fps while dragging the light source through a complex mirror trap.
- UX: A new user can successfully reflect a beam of light within 5 seconds of opening the file without instructions.

## 11. Recommended Skills

| Phase | Skills | Purpose |
|---|---|---|
| Phase 0: Setup | `frontend-design`, `javascript-mastery` | Create a clean, single-file scaffold with proper responsive canvas setup. |
| Phase 1: Engine | `javascript-mastery` | Precise implementation of 2D line vectors and reflection logic. |
| Phase 2: Polish | `core-components`, `frontend-dev-guidelines` | Ensuring the UI looks premium (neon aesthetic, smooth interaction) within constraints. |

---
