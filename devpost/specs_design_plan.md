# OhmSight AR: Devpost Learn Planning Document
**Project:** OhmSight AR: Spatial Breadboard Nodal Solver & Pinch-Interactive Circuit Tutor for Snap Spectacles  
**Track:** Devpost "Learn AR with SPECS" Hackathon ($2,500 USD Cash)  
**Author:** Khanhtnq (`Khanhtnq <218711032+Khanhtnq@users.noreply.github.com>`)  
**Target Platform:** Snap Spectacles (5th Gen / Dual-RGB Optical Waveguide AR Glasses running Snap OS)  
**Tools & SDK:** Lens Studio 5.4+, Spectacles Interaction Kit (SIK), TypeScript, CLAD AI Agent Workflow  

---

## 1. Executive Summary & Problem Statement

### The Problem
Prototyping physical electronics on solderless breadboards is notoriously frustrating for students, electrical engineering majors, and hardware makers:
1. **Invisible Current Flow:** Unlike software where state can be printed or inspected in a debugger, physical electron currents and node voltages are invisible. A loose ground wire or inverted diode looks identical to a working circuit.
2. **Cryptic Physical Multimeters:** Measuring potential differences with bulky physical benchtop multimeters requires taking one's eyes off the circuit, shifting focus back and forth between clumsy leads and a distant seven-segment LCD.
3. **Catastrophic Wiring Mistakes:** Missing a current-limiting resistor or shorting the $V_{CC}$ rail immediately destroys delicate ICs, sensors, and LEDs with no prior visual warning.

### The Solution: OhmSight AR
OhmSight AR leverages Snap Spectacles' spatial hand tracking and optical see-through waveguide displays to turn any physical or holographic solderless breadboard into a live, interactive augmented reality circuit tutor:
- **Index-Thumb Pinch Multimeter Probes:** The user simply pinches their right fingers (Red Lead / Anode) and left fingers (Black Lead / Ground) onto any breadboard tie-points.
- **Floating 3D Holographic Callouts:** Real-time differential voltage ($\Delta V$), branch current ($I$), and dissipated power ($P$) float directly above the probed points with dynamic billboarding.
- **Modified Nodal Analysis (MNA) Engine:** Solves full linear and non-linear circuit equations (KVL, KCL, Ohm's law, Shockley diodes) directly in Lens Studio TypeScript at 60 FPS.
- **Animated Spatial Electron Flow:** Glowing neon particles travel along jumper wires and breadboard internal spring-clip buses at speeds proportional to current magnitude ($v \propto |I|$).
- **Spatial Audio Sonification:** Real-time synthesized pitch shifts with measured voltage (440 Hz at 0V up to 880 Hz at 5V), providing immediate acoustic multimeter feedback.

---

## 2. Spectacles Optical & SIK UX Architecture

### 2.1 Optical Waveguide Display Considerations
Snap Spectacles feature a dual-RGB waveguide optical system with an ultra-low latency see-through engine. Designing for this display requires strict visual principles:
- **High-Contrast Additive Palette:** Pure black (`#000000`) is 100% transparent on waveguide displays. Key telemetry uses vivid neon colors:
  - Neon Cyan (`#00F0FF`) for positive voltage potential.
  - Emerald Green (`#00FF9D`) for equipotential ground rails (0.000 V).
  - Amber / Yellow (`#FFDE00`) for signal dividers and pull-ups.
  - Vivid Red (`#FF3366`) for reverse polarity and overcurrent short circuits.
- **Spatial Billboarding:** All floating callout badges rotate smoothly along the yaw axis toward the wearer's head pose, preventing perspective distortions.
- **Snap Radius & Micro-Haptics:** SIK pinch tracking triggers a subtle haptic impulse upon snapping onto a breadboard tie-point, confirming probe contact without looking away.

### 2.2 Spectacles Interaction Kit (SIK) Mapping
| Gesture / Input | SIK API Hook | Virtual Action |
|---|---|---|
| Right Hand Index-Thumb Pinch | `HandInputData.getHand("right").onPinchDown` | Engages Red Test Probe (+) |
| Left Hand Index-Thumb Pinch | `HandInputData.getHand("left").onPinchDown` | Engages Black Reference Probe (-) |
| Finger Release | `HandInputData.getHand(...).onPinchUp` | Drops probe pin at nearest breadboard hole |
| Palm Facing Wearer | `HandInputData.getHand("left").palmNormal` | Displays Quick-Select Circuit Preset Palette |

---

## 3. Mathematical Foundations of the MNA Solver

The core mathematical engine is based on **Modified Nodal Analysis (MNA)**, formulated as:
$$\begin{bmatrix} \mathbf{G} & \mathbf{B} \\ \mathbf{C} & \mathbf{D} \end{bmatrix} \begin{bmatrix} \mathbf{v} \\ \mathbf{j} \end{bmatrix} = \begin{bmatrix} \mathbf{i} \\ \mathbf{e} \end{bmatrix}$$

- **Conductance Matrix $\mathbf{G}$ ($N \times N$):** Built from conductances $g = 1/R$ connected across nodes.
- **Voltage Source Incidence Matrix $\mathbf{B}$ ($N \times M$):** Encodes connection topology of independent voltage sources.
- **Matrix $\mathbf{C} = \mathbf{B}^T$:** Guaranteed for reciprocal linear networks.
- **Matrix $\mathbf{D}$ ($M \times M$):** Incorporates internal resistance of sources (0 for ideal voltage sources).
- **Non-Linear Companion Models (LEDs / Diodes):** Piecewise linear models with forward knee voltage $V_f$ and dynamic conductance $g_d = 1/r_f$ guarantee unconditional convergence within 1–2 iterations at 60 FPS without numerical singularities.

---

## 4. Submission Checklist & Milestones

- [x] Lens Studio 5.x project structure with `project.esproj` config.
- [x] Authentic TypeScript components:
  - `BreadboardNodalSolver.ts`
  - `PinchProbeController.ts`
  - `SpatialCalloutRenderer.ts`
  - `MNAEngine.ts`
- [x] 100% Passing Automated Electrical Verification Suite (`tests/test_mna_solver.mjs`).
- [x] Full 3D WebGL/WebXR Spatial Simulator (`docs/index.html`).
- [x] Devpost Learn planning documentation (`devpost/`).
- [x] High-resolution thumbnail (`assets/thumbnail_1280x800.png`).
- [x] 40-second 1080p demo video (`assets/demo_specs_1080p.mp4`).
- [x] MIT License & Devpost Submission Guide (`DEVPOST_SPECS_SUBMISSION.md`).
