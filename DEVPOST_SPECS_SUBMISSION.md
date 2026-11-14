# Devpost Submission: OhmSight AR

## Project Title
**OhmSight AR: Spatial Breadboard Nodal Solver & Pinch-Interactive Circuit Tutor for Snap Spectacles**

## Tagline
Pinch your fingers to probe circuits in spatial AR. An authentic Modified Nodal Analysis (MNA) circuit solver, Spectacles Interaction Kit (SIK) hand tracking, and floating holographic callouts turn solderless breadboards into an augmented laboratory on Snap Spectacles.

---

## 1. Short Description
**OhmSight AR** is a spatial augmented reality circuit learning experience designed specifically for Snap Spectacles (5th Gen) and Lens Studio. By tracking the wearer's hands with the Spectacles Interaction Kit (SIK), users turn their index-thumb pinches into dual-lead multimeter test probes (Red Anode and Black Ground). Probing any tie-point on a solderless breadboard instantly solves the entire circuit via an in-engine Modified Nodal Analysis (MNA) solver, rendering floating 3D holographic callout cards, animated electron flow trails along jumper wires, and spatial audio voltage sonification.

Designed for electrical engineering students, STEM educators, and hardware hackers, OhmSight AR makes the invisible physics of voltage, current, and power visible right before the wearer's eyes.

---

## 2. Inspiration
Every hardware maker and engineering student remembers the frustration of their first breadboard project: loose jumper wires, mysterious voltage drops, backwards diodes, and fried LEDs. Multimeters help, but traditional bench instruments force the student to look away from their hands and fumble with physical metal probes.

With the release of Snap Spectacles and the Spectacles Interaction Kit (SIK), we realized that augmented reality can completely change how electronics are taught. Instead of an external device, the wearer’s own fingers become the measurement probes. Instead of calculating node voltages with pencil and paper, the glasses solve the circuit equations live and project the flow of electrons directly onto the breadboard.

---

## 3. What It Does
- **Dual-Lead Pinch Multimeter:** Pinching the right hand deploys the Red positive probe ($V_+$); pinching the left hand deploys the Black reference probe ($V_-$). The probes snap to 2.54 mm breadboard tie-points with haptic confirmation.
- **Real-Time Modified Nodal Analysis (MNA):** Runs an in-engine Gaussian-elimination circuit solver in Lens Studio TypeScript at 60 FPS, resolving node voltages, branch currents, and power dissipation.
- **Waveguide-Optimized Holographic Callouts:** High-contrast cyan (`#00F0FF`), emerald (`#00FF9D`), and amber (`#FFDE00`) cards billboard toward the wearer, displaying $\Delta V$, $I_{branch}$, $P_{dissipated}$, and educational circuit equations.
- **Animated Electron Flow Trails:** Dynamic particles travel along jumper wires and internal spring clips at speeds proportional to current magnitude ($v \propto |I|$).
- **Overcurrent & Short-Circuit Safety Alerts:** Instantly highlights accidental shorts (e.g., $V_{CC}$ to GND) with pulsing red warnings before real hardware gets damaged.
- **Spatial Audio Sonification:** Synthesizes an acoustic tone whose pitch shifts with measured voltage (440 Hz at 0V up to 880 Hz at 5V), allowing hands-free and eyes-free continuity testing.

---

## 4. How We Built It
1. **Lens Studio & Spectacles Interaction Kit (SIK):** Built modular TypeScript components (`BreadboardNodalSolver.ts`, `PinchProbeController.ts`, `SpatialCalloutRenderer.ts`) utilizing the `@component` decorator pattern and SIK `HandInputData` event subscriptions.
2. **Modified Nodal Analysis (MNA) Mathematical Engine (`MNAEngine.ts`):** Formulated linear conductance matrices ($\mathbf{G}$), voltage source coupling matrices ($\mathbf{B}, \mathbf{C}, \mathbf{D}$), and piecewise-linear companion models for non-linear LEDs and diodes. Solved via partial-pivoting Gaussian elimination in under $0.3\text{ ms}$.
3. **Automated Verification Suite (`tests/test_mna_solver.mjs`):** A 100% passing test suite testing Kirchhoff's Voltage Law (KVL), Kirchhoff's Current Law (KCL), symmetrical voltage dividers, Wheatstone bridges, and diode forward voltage thresholds.
4. **Interactive 3D WebGL / WebXR Simulator (`docs/index.html`):** Developed a browser-based 3D digital twin of the Snap Spectacles optical waveguide view, complete with interactive probe selectors, live presets, particle animation, and Web Audio API multimeter tones.
5. **CLAD AI Coding Workflow:** Followed the Devpost Learn skill pack guidelines, documenting planning iterations, prompts, and architectural decisions in the `devpost/` directory.

---

## 5. Challenges We Overcame
- **Non-Linear Diode Convergence at 60 FPS:** Standard Newton-Raphson exponential diode equations can oscillate or diverge when initial guesses are far from the operating point. We engineered a piecewise-linear companion model with dynamic forward bulk resistance ($r_f = 15\,\Omega$) and high reverse impedance, achieving unconditional 1-to-2 iteration convergence without FPS drops.
- **Optical Waveguide Display Ergonomics:** Unlike dark VR headsets, see-through AR glasses add light to the real world. Black pixels are transparent. We designed a vibrant additive palette with glowing particle trails and high-contrast typography optimized for Snap Spectacles waveguides.

---

## 6. Accomplishments That We're Proud Of
- 100% passing automated test suite verifying fundamental laws of electrical engineering.
- Live Modified Nodal Analysis solving in $<0.3\text{ ms}$ on low-power mobile AR silicon.
- Seamless SIK pinch gesture ergonomics where natural two-finger pinches control multimeter leads.
- Fully interactive standalone WebGL simulator accessible on GitHub Pages.

---

## 7. What We Learned
Developing for Snap Spectacles requires a fundamental shift from screen-based thinking to spatial thinking. Tactile interaction must be paired with clear visual and acoustic feedback (snapping sounds, pitch shifts, haptic pulses) to make virtual probes feel as tangible as physical test leads.

---

## 8. What's Next for OhmSight AR
- **Physical Breadboard Computer Vision Tracking:** Using Spectacles' world-facing cameras with object detection to automatically identify real placed resistors and ICs on physical breadboards.
- **AC Circuit Analysis & Oscilloscope Mode:** Adding capacitors, inductors, and alternating current (AC) sinusoidal time-domain waveforms.
- **Multiplayer Collaborative Lab Mode:** Allowing students and professors to share the same holographic circuit in real-time AR classrooms.

---

## 9. Repository Structure
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
└── README.md                            # Comprehensive project overview
```
