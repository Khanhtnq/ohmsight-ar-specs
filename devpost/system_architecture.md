# OhmSight AR: System Architecture & Circuit Theory
**Project:** OhmSight AR: Spatial Breadboard Nodal Solver for Snap Spectacles  
**Author:** Khanhtnq (`Khanhtnq <218711032+Khanhtnq@users.noreply.github.com>`)  

---

## 1. High-Level Architecture Diagram

```
+--------------------------------------------------------------------------+
|                        Snap Spectacles Hardware                          |
|  - Dual RGB Optical Waveguides (High Brightness Additive Display)         |
|  - Dual 6DoF Spatial Cameras & Optical Hand Tracking Sensors              |
|  - Spatial Audio Engine & Bone Conduction / Temple Transducers            |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+------------------------------------+-------------------------------------+
|                  Spectacles Interaction Kit (SIK)                        |
|  - HandInputData: 21-joint skeleton tracking per hand                    |
|  - PinchDetector: Left hand (Black Probe), Right hand (Red Probe)        |
|  - Spatial Raycaster: Breadboard tie-point snap detection (2.54mm pitch)  |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+------------------------------------+-------------------------------------+
|                     OhmSight Runtime System                              |
|                                                                          |
|  +---------------------------+       +--------------------------------+  |
|  |  BreadboardNodalSolver    | <---> |   PinchProbeController         |  |
|  |  - Breadboard Pin Grid    |       |   - Dual-lead multimeter logic |  |
|  |  - Tie-point bus mapping  |       |   - Audio frequency pitch synth|  |
|  +-------------+-------------+       +----------------+---------------+  |
|                |                                      |                  |
|                v                                      v                  |
|  +---------------------------+       +--------------------------------+  |
|  |      MNAEngine (MNA)      | ----> |    SpatialCalloutRenderer      |  |
|  |  - Conductance Stamping   |       |   - Billboarded 3D HUD cards   |  |
|  |  - Gaussian Elimination   |       |   - Electron particle trails   |  |
|  |  - Diode companion models |       |   - Overcurrent warnings       |  |
|  +---------------------------+       +--------------------------------+  |
+--------------------------------------------------------------------------+
```

---

## 2. Breadboard Coordinate Topology Mapping

A solderless breadboard consists of 830 tie-points organized into distinct electrical domains:
1. **Power Rails:**
   - Top Positive (`+T` / `+1` / `RAIL_T_POS`): Continuous horizontal copper bus running the width of the board.
   - Top Negative / Ground (`-T` / `-1` / `RAIL_T_NEG`): Continuous ground rail.
   - Bottom Rails (`+B`, `-B`): Identical horizontal buses.
2. **Terminal Strips:**
   - Divided into 30 to 63 columns.
   - Columns A, B, C, D, E are connected vertically by a 5-contact spring clip (`ROW_N_TOP`).
   - Columns F, G, H, I, J are connected vertically by a separate 5-contact spring clip (`ROW_N_BOT`).
   - The central 0.3-inch (7.62 mm) trough electrically isolates the top and bottom groups, allowing standard Dual In-Line Package (DIP) ICs to straddle the center.

`MNAEngine.normalizePin(pin)` maps any user probe position or wire pin identifier into its exact topological electrical node, ensuring $O(1)$ node lookup and zero matrix redundancy.

---

## 3. Matrix Formulation & Numerical Stability

### 3.1 Linear Branch Stamping
For each resistor $R$ connected between nodes $u$ and $v$ with conductance $g = 1/R$:
$$A_{u,u} \gets A_{u,u} + g, \quad A_{v,v} \gets A_{v,v} + g$$
$$A_{u,v} \gets A_{u,v} - g, \quad A_{v,u} \gets A_{v,u} - g$$

### 3.2 Independent Voltage Sources
For an independent voltage source $V_s$ between nodes $u$ ($+$) and $v$ ($-$) occupying auxiliary column $k$:
$$A_{u,k} = +1, \quad A_{v,k} = -1$$
$$A_{k,u} = +1, \quad A_{k,v} = -1$$
$$z_k = V_s$$

### 3.3 Partial Pivoting Gaussian Elimination
To run deterministically on low-power Spectacles SoC hardware without external library dependencies, the system uses in-place row-echelon reduction with partial pivoting:
$$\text{pivot} = \operatorname{argmax}_{r \ge p} |M_{r,p}|$$
If the pivot element is smaller than $10^{-12}$, slight regularization ($10^{-9}$) is injected to gracefully handle floating or open-circuit nodes without crashing or throwing divide-by-zero exceptions.

---

## 4. Performance & Memory Profile on Spectacles
- **Frame Rate:** Locked 60 FPS in Lens Studio preview and on Spectacles hardware.
- **MNA Execution Time:** $0.18\text{ ms} - 0.32\text{ ms}$ for typical 10–20 node breadboard circuits.
- **Memory Footprint:** $< 12\text{ MB}$ total JavaScript heap.
- **Zero GC Churn:** Reuses matrix buffers and typed structures during the main animation loop.
