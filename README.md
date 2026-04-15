# OPTICSPACE | Photon Laboratory

![OpticSpace Branding](https://img.shields.io/badge/Aesthetic-Tactical_Precision-cyan?style=for-the-badge)
![Physics-Ready](https://img.shields.io/badge/Physics-Ray_Tracing-blueviolet?style=for-the-badge)
![Zero-Dependency](https://img.shields.io/badge/Zero-Dependencies-success?style=for-the-badge)

**OPTICSPACE** is a high-fidelity, interactive physics simulator designed for demonstrating and exploring the laws of reflection. Built with a "Tactical Precision Engineering" aesthetic, it transforms complex optics principles into a cinematic, data-dense laboratory environment.

---

## 🔬 Core Capabilities

### ⚡ Advanced Ray Tracing Engine
- **Real-time Path Calculation**: Instantaneous reflection math using the Law of Reflection ($ \theta_i = \theta_r $).
- **Multiple Light Sources**: Support for both **Point Lights** and **Precision Lasers** with adjustable beam properties.
- **Deep Bounce Logic**: Rays support up to 15 bounces, enabling the creation of complex light traps and kaleidoscopic patterns.

### 🪞 Optical Element Suite
- **Flat Mirrors**: Standard reflective surfaces for basic demonstrations.
- **Curved Optics**: Fully interactive **Concave** and **Convex** mirrors for exploring focal points and image formation.
- **Freehand Drawing**: Create custom reflective geometry for unique experimental setups.
- **Dynamic Manipulation**: Move, rotate, and resize elements with precision handles.

### 📏 Measurement & Diagnostics
- **Interactive Ruler**: Quantify distances between objects and ray segments in real-time.
- **Integrated Protractor**: Measure angles of incidence and reflection at bounce points.
- **Advanced Overlays**: Toggle unit scales, normal lines, and virtual image projections.

### 🏆 Challenge Lab
- **Scenario Puzzles**: Solve objective-based optics challenges ranging from basic focus alignment to complex ray manipulation.
- **Progress Tracking**: Real-time evaluation of objectives with a professional HUD feedback system.

---

## 🎨 Design Philosophy: Tactical Precision
OpticSpace rejects soft consumer aesthetics in favor of a mission-critical lab environment:
- **Abyssal Depth**: A deep `#121315` foundation with scan-line overlays and holographic grain.
- **Electric Accents**: High-contrast `#00f0ff` cyan indicators simulating light emission.
- **Monospaced Clarity**: IBM Plex Mono for all telemetry, ensuring an "engineering drawing" feel.

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, or Edge recommended).
- **Zero installation required.**

### Project Structure
```
├── assets/             # Raw design exports (Stitch) and resources
│   └── stitch_source/
├── docs/               # Technical and design documentation
├── src/                # Source logic and initial versions
│   ├── simLogic.js
│   └── index_v1.html
├── index.html          # Main entry point (Modernized v2)
├── build.py            # Build automation script
└── README.md           # Project overview
```

### Usage
1. Clone the repository:
   ```bash
   git clone https://github.com/arjeldru-dev/physics-simulator.git
   ```
2. Open `index.html` in your browser to access the full modernized suite.
3. For the initial "Mirror Room" experience, open `src/index_v1.html`.

### Controls
| Input | Action |
|---|---|
| **Left Click + Drag** | Draw a mirror element or pull selection box |
| **Right Click / BS** | Delete hovered element |
| **R** | Activate Ruler tool |
| **P** | Activate Protractor tool |
| **Handle Drag** | Rotate or move existing optical elements |

---

## 🛠️ Technical Architecture
- **Rendering**: HTML5 High-Performance Canvas API.
- **Logic**: Vanilla ES6 JavaScript (zero external dependencies).
- **UI Framework**: Tailwind CSS (Post-processed for production).
- **Build System**: Python-based bundler (`build.py`) for compiling logic and templates.

---

## 👨‍💻 Development
If you wish to modify the simulation logic, edit `simLogic.js`. To rebuild the standalone `index.html`, run:
```powershell
python build.py
```

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information (if applicable).

---
*Created with focus on clarity, precision, and the beauty of physics.*
