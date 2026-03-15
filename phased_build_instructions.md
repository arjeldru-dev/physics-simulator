# Phased Build Instructions: Mirror Room

Based on the [Project Specification](./project_specification.md), here is the detailed phase-by-phase implementation plan for building the MVP of Mirror Room.

## Phase 0: Scaffolding (1 Hour)
**Focus:** Empty `index.html` with full-screen Canvas and resizing logic.
**Goal:** Establish the single-file environment and ensure the canvas acts as a responsive surface.

**Actionable Steps:**
1. **Create `index.html`:** Initialize the standard HTML5 boilerplate.
2. **Add Canvas:** Insert a `<canvas id="simCanvas"></canvas>` element into the `<body>`.
3. **Basic Styling:** Apply vanilla CSS in a `<style>` block to:
   - Reset margins/padding (`margin: 0; overflow: hidden;`).
   - Set the canvas background to `#111111` (Neon Blackboard aesthetic).
4. **JS Initialization:** Start a `<script>` section. Fetch the canvas element and get its 2D context (`ctx`).
5. **Window Resizing:** Add an event listener for `resize`. 
   - Dynamically set `canvas.width = window.innerWidth` and `canvas.height = window.innerHeight`. 
   - Trigger it once on initial load.
6. **Main Loop Setup:** Create an animation loop (`function loop() { ... requestAnimationFrame(loop); }`) that clears the canvas (`ctx.clearRect()`) every frame.

## Phase 1: Interaction State (1 Hour)
**Focus:** Mouse event listeners for dragging the light source and drawing/storing mirrors.
**Goal:** Implement state management and capture all user inputs without yet performing physics calculations.

**Actionable Steps:**
1. **Define State:** Create configuration and state variables:
   - `let mirrors = [];` (Array of objects like `{x1, y1, x2, y2}`)
   - `let lightSource = {x: window.innerWidth / 2, y: window.innerHeight / 2};`
   - `let isDraggingLight = false;`
   - `let drawingMirrorStart = null;` (Holds origin `{x,y}` while drawing)
2. **Mouse Logic - Light Source:**
   - **`mousedown`:** Check if the distance to `lightSource` is small (e.g., radius `< 20px`). If yes, set `isDraggingLight = true`.
   - **`mousemove`:** If `isDraggingLight` is true, update `lightSource.x` and `lightSource.y` to the cursor coordinates.
   - **`mouseup`:** Set `isDraggingLight = false`.
3. **Mouse Logic - Mirrors:**
   - **`mousedown`:** If not dragging the light, begin drawing a mirror. Store the coordinates in `drawingMirrorStart`.
   - **`mousemove`:** Provide visual feedback by storing a temporary endpoint for the line being actively drawn.
   - **`mouseup`:** If actively drawing, check the distance to `drawingMirrorStart`. If the length is `> 0`, commit the mirror by pushing `{x1, y1, x2, y2}` to the `mirrors` array. Clear `drawingMirrorStart`.
4. **Render Entities:** Inside the main loop, draw:
   - A distinct glowing circle (`#FFEA00`) for the light source.
   - Solid white (`#FFFFFF`) lines for all committed mirrors.
   - A ghost line for a preview of the mirror currently being drawn.

## Phase 2: The Physics Engine (2 Hours)
**Focus:** Line intersection math and 8-bounce reflection loop.
**Goal:** Calculate the paths of 36 distinct light rays, computing accurate wall collisions and reflection angles.

**Actionable Steps:**
1. **Ray Initialization:** On every frame in the render loop, define 36 initial unit vectors (from $0$ to $360^\circ$) originating from the `lightSource`.
2. **Intersection Math:** Implement a helper function `getIntersection(x1, y1, x2, y2, x3, y3, x4, y4)` determining the intersection point between two line segments. Ensure it correctly returns the point coordinates and the distance to the point.
3. **Collision Detection:**
   - Loop through each active ray.
   - Test the ray segment against every mirror in the `mirrors` array to find the *closest* intersection point.
   - Incorporate a tiny *epsilon offset* along the bounce regular normal to prevent a ray strictly stuck inside the wall calculation loop.
4. **Reflection Math:** 
   - If a collision is registered, calculate the mirror segment's normal vector.
   - Produce the outcome reflection vector utilizing the formula: `R = D - 2(D·N)N` (where `D` is ray direction and `N` is surface normal).
   - Register the hit coordinate and originate a new ray line from that point with the new `R` direction.
5. **Multi-Bounce Constraint:** Wrap this in a `while` or `for` loop restricted to a maximum of **8 bounces** per initial ray.

## Phase 3: Rendering & Polish (2 Hours)
**Focus:** Drawing fading rays, hover-to-delete logic, glowing effects, and UI completion.
**Goal:** Achieve the final "Neon Blackboard" aesthetics and fully flesh out the user workflows.

**Actionable Steps:**
1. **Ray Rendering with Fade:** Draw paths for all successfully computed rays.
   - Use the primary color (`#FFEA00`).
   - Track cumulative ray traversal distance. As the path length grows, incrementally decrease the `rgba()` alpha opacity.
2. **Hover-to-Delete Implementation:**
   - In the `mousemove` handler, run a distance-to-line-segment calculation for all mirrors.
   - If close (e.g., `< 12px` distance), visually "highlight" the target mirror segment (increase stroke width or tint red).
   - Add a listener for keyboard `Backspace` or `Delete`. If a target is highlighted, remove it from the `mirrors` array.
3. **Clear All UI:**
   - Append an absolutely positioned HTML `<button>` labeled "Clear All". Ensure it has light typography that matches the vibe.
   - Add an event listener to the button. On click, assign `mirrors = [];`.
4. **Visual & Performance Tuning:**
   - Apply CSS `text-shadow` / `box-shadow` on UI elements.
   - Test interaction speeds with ~50 active mirrors, watching for 60fps dips around complex ray traps natively.

---
*Success Metric Check:* Upon completing these phases, users should be able to manipulate continuous bouncing light arrays seamlessly from a single 100-line index file setup.
