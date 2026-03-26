# Design System Strategy: Cinematic Laboratory Interface

## 1. Overview & Creative North Star
**The Creative North Star: "Tactical Precision Engineering"**

This design system rejects the soft, approachable aesthetics of modern consumer web apps in favor of a high-fidelity, mission-critical laboratory environment. We are building a "Digital Blueprint"—an interface that feels less like a website and more like a high-end heads-up display (HUD) for deep-space optics.

The system breaks the "template" look through **intentional architectural rigidity**. We use sharp angles, hairline precision, and mono-spaced data density to convey absolute authority. By prioritizing raw engineering aesthetics—blueprint grids, scan-lines, and light-emitting elements—we create an immersive "Abyssal" depth that feels both premium and cinematic.

---

## 2. Colors & Atmospheric Depth

The palette is rooted in the "Void." We do not use color for decoration; we use it for illumination and status.

### The Surface Hierarchy
Depth is achieved through **Tonal Layering**, not shadows.
- **Base Layer:** `surface` (#121315) – The absolute floor of the UI.
- **Lower Tiers:** `surface_container_lowest` (#0d0e10) for recessed viewport backgrounds or "dead" zones.
- **Upper Tiers:** `surface_container_high` (#292a2c) for active diagnostic panels.

### The "No-Line" Rule & The Hairline Exception
Prohibit standard 1px solid borders for sectioning. 
- Boundaries are defined by the shift from `surface` to `surface_container_low`.
- **The Hairline Exception:** Where structural definition is required, use `outline_variant` (#3b494b) at a stroke width of 0.5px. It should feel like a technical drawing, not a container.

### Signature Textures & Glows
- **Holographic Grain:** Apply a 2% opacity noise overlay to `surface_container` elements to simulate physical hardware monitors.
- **Electric Accents:** Use `primary_container` (#00f0ff) with a `4px` outer blur (soft radial glow) for active data points. This simulates light emission in a dark laboratory.
- **Scan-line Overlay:** A fixed background pattern of horizontal lines (2px apart, 5% opacity) across the entire canvas to reinforce the cinematic terminal aesthetic.

---

## 3. Typography: The Technical Monospace

The typographic system creates a hierarchy between "Brand Authority" and "Operational Data."

- **Display & Headlines (Unbounded):** These are your architectural anchors. Use `display-lg` for terminal headers with a mandatory `letter-spacing: 4px` and `text-transform: uppercase`. This font should feel carved out of the interface.
- **Operational UI (IBM Plex Mono):** All labels, inputs, and data readouts use IBM Plex Mono. This ensures every character—whether a coordinate or a status code—occupies the same visual footprint, reinforcing the "engineering drawing" aesthetic.
- **Tracking:** For `label-sm` and `label-md`, increase letter-spacing to `0.1rem` to ensure legibility against dark, textured backgrounds.

---

## 4. Elevation & Depth: Tonal Stacking

We do not use "Elevation" in the Material Sense. There are no floating cards with shadows.

- **The Layering Principle:** Place a `surface_container_high` module directly onto the `surface_dim` background. The contrast in value provides the "lift."
- **Ghost Borders:** If a high-priority module needs focus, use a "Ghost Border"—a `0.5px` border of `primary` (#dbfcff) at 20% opacity. 
- **Backdrop Blurs:** For transient elements (modals/overlays), use `surface_container` with a `20px` backdrop-blur. This simulates "Frosted Polymer"—a high-end material used in futuristic lab shielding.

---

## 5. Components

### Buttons: Tactical Actuators
- **Primary:** Background `primary_container` (#00f0ff), text `on_primary` (#00363a). **Strict 0px border-radius.** Use a `2px` left-side highlight of `primary_fixed` to indicate depth.
- **Secondary:** Transparent background, `0.5px` border of `outline`. Hover state: Background `surface_bright` at 10% opacity.
- **Interaction:** On hover, primary buttons should "flicker" once (0.1s opacity shift) to mimic a hardware terminal response.

### Inputs & Terminal Fields
- **Text Inputs:** Background `surface_container_lowest`. No bottom border. Instead, use "Corner Brackets"—small L-shaped vectors in the corners using the `primary` token.
- **Caret:** The cursor must be a solid block (`primary`) that blinks at a steady 500ms interval.

### Cards & Modules
- **Forbid Dividers:** Do not use horizontal lines to separate content. Use `spacing-6` (1.3rem) vertical gaps or a `surface` tier shift.
- **Angular Cuts:** Where possible, use a "clipped corner" (45-degree cut) on the top-right of containers rather than a radius.

### Additional Lab Components
- **The Blueprint Grid:** A persistent background grid using `outline_variant` at 5% opacity, aligned to the `8px` spacing scale.
- **Status Beacons:** Small circular indicators using `primary` (Active) or `error` (Critical), featuring a pulsing `8px` radial glow.

---

## 6. Do's and Don'ts

### Do:
- **Use High Data Density:** Laboratory interfaces should feel information-rich. Use `body-sm` for secondary telemetry.
- **Embrace Asymmetry:** Align primary controls to the left, but allow data visualizations to bleed into the right margins to break the "webpage" feel.
- **Maintain 4px Max Radius:** Only use radii where physical touch safety would be a concern in a real lab; otherwise, keep it `0px`.

### Don't:
- **No Soft Gradients:** Avoid "sunsets" or multi-color gradients. Use only monochromatic tonal shifts or "Light-to-Transparent" glows.
- **No Rounded Buttons:** Rounded "pill" buttons destroy the engineering aesthetic. Stay angular.
- **No Pure White:** Never use #FFFFFF. Use `primary` (#dbfcff) for the brightest text to maintain the cool, electric temperature of the system.