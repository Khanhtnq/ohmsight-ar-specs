# OhmSight AR: Spatial Breadboard Nodal Solver & Pinch-Interactive Circuit Tutor for Snap Spectacles

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Target: Snap Spectacles](https://img.shields.io/badge/Target-Snap%20Spectacles-yellow.svg)](https://www.spectacles.com/)
[![Engine: Lens Studio 5.x](https://img.shields.io/badge/Lens%20Studio-5.4%2B-purple.svg)](https://ar.snap.com/lens-studio)
[![Tests: 100% Passed](https://img.shields.io/badge/Tests-100%25%20Passed-brightgreen.svg)](#automated-testing)

> **Devpost "Learn AR with SPECS" Submission**  
> **Author:** Khanhtnq (`Khanhtnq <218711032+Khanhtnq@users.noreply.github.com>`)

---

## ⚡ Overview

**OhmSight AR** is a spatial augmented reality circuit tutor engineered specifically for **Snap Spectacles (5th Gen)** and **Lens Studio**. It transforms the wearer's natural index-thumb pinches into dual-lead multimeter probes (Red Anode and Black Cathode) via the **Spectacles Interaction Kit (SIK)**. 

Probing any tie-point on a solderless breadboard calculates real-time electrical potential ($\Delta V$), branch current ($I$), and power dissipation ($P$) using an in-engine **Modified Nodal Analysis (MNA)** Gaussian-elimination solver running at 60 FPS.

---

## 🚀 Key Features

1. **Dual-Lead SIK Pinch Probes:**
   - **Right Hand Pinch:** Red positive test probe ($V_+$).
   - **Left Hand Pinch:** Black ground reference probe ($V_-$).
   - Dynamic snap to standard 2.54 mm pitch breadboard holes with micro-haptic pulses.
2. **Authentic Modified Nodal Analysis (MNA):**
   - Pure TypeScript matrix formulation solving linear resistors, independent DC sources, wires, and non-linear LEDs/diodes.
   - Computes node voltages and branch currents in $<0.3\text{ ms}$.
3. **Waveguide-Optimized Spatial Callouts:**
   - Holographic billboarded cards formatted in high-contrast cyan (`#00F0FF`), emerald (`#00FF9D`), and yellow (`#FFDE00`).
   - Displays measured differential voltage, branch current, and educational formula hints.
4. **Animated Spatial Electron Flow:**
   - Visualizes moving electron particles along jumper wires at speeds proportional to current magnitude ($v \propto |I|$).
5. **Acoustic Voltage Sonification:**
   - Synthesizes audio tones whose frequency tracks measured voltage (440 Hz at 0V up to 880 Hz at 5V).
6. **3D WebGL / WebXR Simulator:**
   - A standalone interactive web simulator in `docs/index.html` replicating the full Spectacles experience in modern desktop and mobile browsers.

---

## 🛠️ Project Structure

```
├── Assets/
│   ├── Scripts/
│   │   ├── BreadboardNodalSolver.ts     # Lens Studio Breadboard topology & component solver
│   │   ├── PinchProbeController.ts      # SIK dual-hand pinch & multimeter probe manager
│   │   ├── SpatialCalloutRenderer.ts    # Holographic HUD callout & particle renderer
│   │   └── MNAEngine.ts                 # Pure TypeScript MNA matrix & Gaussian elimination
├── assets/
│   ├── thumbnail_1280x800.png           # High-resolution submission thumbnail
│   └── demo_specs_1080p.mp4             # 40-second 1080p demonstration video
├── devpost/
│   ├── specs_design_plan.md             # Devpost Learn skill pack planning document
│   ├── system_architecture.md           # Circuit theory, MNA formulation & system diagrams
│   └── clad_prompts.md                  # CLAD AI agent workflow and prompt audit trail
├── docs/
│   └── index.html                       # 3D WebGL/WebXR interactive simulator with Web Audio
├── tests/
│   └── test_mna_solver.mjs              # 100% passing automated KVL/KCL test suite
├── project.esproj                       # Lens Studio 5.x Spectacles project manifest
├── package.json                         # Node.js project & test runner script
├── tsconfig.json                        # TypeScript compiler options
├── LICENSE                              # MIT License
└── DEVPOST_SPECS_SUBMISSION.md          # Full Devpost hackathon submission copy
```

---

## 🧪 Automated Testing

Run the automated MNA solver verification suite:

```bash
npm test
# or: node tests/test_mna_solver.mjs
```

### Verified Electrical Laws
- **Test 1:** Symmetrical Voltage Divider ($5\text{V}, 10\text{k}\Omega / 10\text{k}\Omega \to 2.500\text{V}$, KVL loop consistency).
- **Test 2:** Kirchhoff's Current Law (KCL) across 3-way parallel branches ($100\Omega, 200\Omega, 300\Omega$).
- **Test 3:** Balanced Wheatstone Bridge ($R_1/R_2 = R_3/R_4 \implies \Delta V = 0.000\text{V}$, zero meter current).
- **Test 4:** Unbalanced Wheatstone Bridge (galvanometer deflection).
- **Test 5:** Non-linear LED forward conduction ($V_f \approx 1.8\text{V}$, current limiting to $13.6\text{mA}$).
- **Test 6:** Breadboard tie-point coordinate normalization (`A15` to `ROW_15_TOP`, `+T` to `RAIL_T_POS`).
- **Test 7:** Direct short-circuit overload detection ($I > 5\text{A}$ flag).

**Results:** `7 / 7 Passed (100%)`.

---

## 🌐 3D Web Simulator

Open `docs/index.html` in any browser or host it via GitHub Pages to experience the spatial simulator with interactive probe drag-and-drop, circuit presets, particle trails, and Web Audio synthesizer tones.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
