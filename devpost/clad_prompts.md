# OhmSight AR: CLAD AI Agent Workflow & Prompts Log
**Project:** OhmSight AR: Spatial Breadboard Nodal Solver for Snap Spectacles  
**Author:** Khanhtnq (`Khanhtnq <218711032+Khanhtnq@users.noreply.github.com>`)  
**Hackathon:** Devpost "Learn AR with SPECS"  

---

## 1. Overview of CLAD Integration
The Devpost Learn skill pack mandates planning and building using CLAD (Context-Leveraged Agentic Development) via an AI coding agent paired with Lens Studio tools. This document records the prompts, agent interactions, and design iterations that produced OhmSight AR.

---

## 2. Agent Prompt Sequence

### Prompt 1: Spatial Concept & Spectacles Ergonomics
> *"Design an augmented reality Lens for Snap Spectacles (5th Gen) running Snap OS that solves a fundamental educational pain point in electronics engineering. Must utilize Spectacles Interaction Kit (SIK) hand tracking and pinch gestures, dual-RGB waveguide display considerations, and spatial audio."*
- **Outcome:** Defined the "OhmSight AR" spatial breadboard concept. Dual-hand index-thumb pinch acts as multimeter test leads (Right hand = Red lead, Left hand = Black lead). Floating 3D holographic callout cards display real-time $\Delta V$, $I$, and $P$.

### Prompt 2: Mathematical Engine & Modified Nodal Analysis (MNA)
> *"Implement a pure TypeScript circuit simulation engine based on Modified Nodal Analysis (MNA) capable of running at 60 FPS in Lens Studio. It must solve linear resistors, independent DC voltage sources, wires, and non-linear LEDs/diodes with high numerical stability and zero external npm dependencies."*
- **Outcome:** Generated `MNAEngine.ts` with conductance stamping, voltage source matrices ($B, C, D$), companion diode models, and partial-pivoting Gaussian elimination.

### Prompt 3: Lens Studio TypeScript Component Integration
> *"Create authentic Lens Studio 5.x component scripts adhering to the `@component` decorator pattern. Components required: `BreadboardNodalSolver.ts` for breadboard pin grid mapping and node tracking, `PinchProbeController.ts` interfacing with SIK `HandInputData`, and `SpatialCalloutRenderer.ts` for waveguide-optimized high-contrast AR badges."*
- **Outcome:** Created `BreadboardNodalSolver.ts`, `PinchProbeController.ts`, and `SpatialCalloutRenderer.ts` ready for Lens Studio scene graph deployment.

### Prompt 4: Rigorous Test Verification Suite
> *"Write an automated Node.js test script `tests/test_mna_solver.mjs` that verifies 100% compliance with Kirchhoff's Voltage Law (KVL), Kirchhoff's Current Law (KCL), Ohm's law, balanced/unbalanced Wheatstone bridges, and diode forward voltage thresholds."*
- **Outcome:** Formulated 7 test suites that run synchronously with zero failures (`7/7 Passed, 100%`).

### Prompt 5: Spatial 3D WebGL/WebXR Preview
> *"Build a standalone 3D WebGL/WebXR spatial simulator in `docs/index.html` replicating the Snap Spectacles AR experience. Include interactive breadboard graphics, draggable/selectable multimeter probe pins, animated electron flow particles, circuit preset toggles, and Web Audio API tone synthesis."*
- **Outcome:** Built `docs/index.html`, delivering a complete in-browser interactive simulator with live MNA solver telemetry.
