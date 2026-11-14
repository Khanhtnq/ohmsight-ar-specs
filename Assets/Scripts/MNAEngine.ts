/**
 * OhmSight AR - Modified Nodal Analysis (MNA) Linear & Non-Linear Circuit Engine
 * Lens Studio / Snap Spectacles AR & WebXR Compatible TypeScript Engine
 * 
 * Formulates and solves: [ A ] * [ x ] = [ z ]
 * where A = [ G   B ]
 *           [ C   D ]
 * x = [ v (node voltages), j (voltage source currents) ]^T
 * z = [ i (nodal current injections), e (independent voltage sources) ]^T
 */

export interface CircuitNode {
  id: number;
  name: string;
  voltage: number;
  isReference: boolean;
}

export type ComponentType = 'RESISTOR' | 'VOLTAGE_SOURCE' | 'CURRENT_SOURCE' | 'DIODE' | 'LED' | 'WIRE' | 'SWITCH';

export interface CircuitBranch {
  id: string;
  name: string;
  type: ComponentType;
  nodePos: string; // pin string (e.g. "A15", "+T", "F12")
  nodeNeg: string; // pin string
  nodePosIdx?: number;
  nodeNegIdx?: number;
  value: number; // Resistance (Ohms), Voltage (V), Current (A), Forward voltage threshold
  current?: number; // Calculated Amperes
  power?: number;   // Calculated Watts
  state?: boolean;  // for switch/LED illumination
  color?: string;   // hex display color
}

export interface SolveResult {
  converged: boolean;
  iterations: number;
  nodeVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  branchPowers: Map<string, number>;
  summary: {
    totalPowerConsumed: number;
    maxVoltage: number;
    minVoltage: number;
    shortCircuitDetected: boolean;
    openCircuitNodes: string[];
  };
}

export class MNAEngine {
  private branches: CircuitBranch[] = [];
  private nodeMap: Map<string, number> = new Map(); // pin/group name -> 0-indexed node (0 = GND)
  private reverseNodeMap: Map<number, string> = new Map();
  private groundPin: string = '-T'; // Default ground is top negative power rail

  constructor(groundPinName: string = '-T') {
    this.groundPin = groundPinName;
  }

  public setGround(pinName: string): void {
    this.groundPin = pinName;
  }

  public getGround(): string {
    return this.groundPin;
  }

  public addBranch(branch: CircuitBranch): void {
    this.branches.push({ ...branch });
  }

  public clear(): void {
    this.branches = [];
    this.nodeMap.clear();
    this.reverseNodeMap.clear();
  }

  /**
   * Normalizes a breadboard pin coordinate into its electrically connected tie-point group.
   */
  public normalizePin(pin: string): string {
    const raw = pin.trim().toUpperCase();
    if (raw === 'GND' || raw === 'GROUND' || raw === '-T' || raw === '-1' || raw === 'T_NEG') {
      return 'RAIL_T_NEG';
    }
    if (raw === '+T' || raw === '+1' || raw === 'VCC' || raw === 'T_POS' || raw === '+5V' || raw === '+9V') {
      return 'RAIL_T_POS';
    }
    if (raw === '-B' || raw === '-2' || raw === 'B_NEG') {
      return 'RAIL_B_NEG';
    }
    if (raw === '+B' || raw === '+2' || raw === 'B_POS') {
      return 'RAIL_B_POS';
    }

    const match = raw.match(/^([A-J])(\d{1,2})$/);
    if (match) {
      const col = match[1];
      const row = parseInt(match[2], 10);
      return col >= 'A' && col <= 'E' ? `ROW_${row}_TOP` : `ROW_${row}_BOT`;
    }

    return raw;
  }

  private buildNodeIndex(): void {
    this.nodeMap.clear();
    this.reverseNodeMap.clear();

    const normalizedGnd = this.normalizePin(this.groundPin);
    this.nodeMap.set(normalizedGnd, 0);
    this.reverseNodeMap.set(0, normalizedGnd);

    let nextNodeIdx = 1;
    for (const b of this.branches) {
      const nPos = this.normalizePin(b.nodePos);
      const nNeg = this.normalizePin(b.nodeNeg);

      if (!this.nodeMap.has(nPos)) {
        this.nodeMap.set(nPos, nextNodeIdx);
        this.reverseNodeMap.set(nextNodeIdx, nPos);
        nextNodeIdx++;
      }
      if (!this.nodeMap.has(nNeg)) {
        this.nodeMap.set(nNeg, nextNodeIdx);
        this.reverseNodeMap.set(nextNodeIdx, nNeg);
        nextNodeIdx++;
      }
    }
  }

  /**
   * Solves the circuit using Modified Nodal Analysis with robust piecewise linear diode companion model.
   */
  public solve(maxIterations: number = 30, tolerance: number = 1e-4): SolveResult {
    this.buildNodeIndex();

    const numNodes = this.nodeMap.size;
    const nonRefNodes = numNodes - 1;

    const activeBranches = this.branches.filter(b => b.type !== 'SWITCH' || b.state !== false);
    const vSources = activeBranches.filter(b => b.type === 'VOLTAGE_SOURCE');
    const m = vSources.length;
    const matrixSize = nonRefNodes + m;

    if (matrixSize <= 0) {
      return {
        converged: true,
        iterations: 0,
        nodeVoltages: new Map([[this.normalizePin(this.groundPin), 0]]),
        branchCurrents: new Map(),
        branchPowers: new Map(),
        summary: {
          totalPowerConsumed: 0,
          maxVoltage: 0,
          minVoltage: 0,
          shortCircuitDetected: false,
          openCircuitNodes: []
        }
      };
    }

    const diodeStates: Map<string, boolean> = new Map();
    for (const b of activeBranches) {
      if (b.type === 'DIODE' || b.type === 'LED') {
        diodeStates.set(b.id, false);
      }
    }

    let converged = false;
    let iter = 0;
    let nodeVoltages = new Map<string, number>();
    let branchCurrents = new Map<string, number>();
    let branchPowers = new Map<string, number>();

    while (iter < maxIterations && !converged) {
      iter++;
      const A: number[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));
      const z: number[] = Array(matrixSize).fill(0);
      const n2m = (n: number) => n - 1;

      for (const b of activeBranches) {
        const u = this.nodeMap.get(this.normalizePin(b.nodePos))!;
        const v = this.nodeMap.get(this.normalizePin(b.nodeNeg))!;

        if (b.type === 'RESISTOR' || b.type === 'WIRE') {
          const r = b.type === 'WIRE' ? 1e-4 : Math.max(b.value, 1e-5);
          const g = 1.0 / r;
          if (u > 0) A[n2m(u)][n2m(u)] += g;
          if (v > 0) A[n2m(v)][n2m(v)] += g;
          if (u > 0 && v > 0) {
            A[n2m(u)][n2m(v)] -= g;
            A[n2m(v)][n2m(u)] -= g;
          }
        } else if (b.type === 'CURRENT_SOURCE') {
          if (u > 0) z[n2m(u)] -= b.value;
          if (v > 0) z[n2m(v)] += b.value;
        } else if (b.type === 'DIODE' || b.type === 'LED') {
          const Vf = b.type === 'LED' ? (b.value || 1.8) : (b.value || 0.7);
          const rf = 15.0; // dynamic forward bulk resistance (15 ohms)
          const rrev = 1e6; // reverse leakage (1 Meg)
          const isForward = diodeStates.get(b.id);

          const gd = isForward ? (1.0 / rf) : (1.0 / rrev);
          const Ieq = isForward ? (-Vf / rf) : 0;

          if (u > 0) A[n2m(u)][n2m(u)] += gd;
          if (v > 0) A[n2m(v)][n2m(v)] += gd;
          if (u > 0 && v > 0) {
            A[n2m(u)][n2m(v)] -= gd;
            A[n2m(v)][n2m(u)] -= gd;
          }
          if (u > 0) z[n2m(u)] -= Ieq;
          if (v > 0) z[n2m(v)] += Ieq;
        }
      }

      for (let k = 0; k < m; k++) {
        const vb = vSources[k];
        const u = this.nodeMap.get(this.normalizePin(vb.nodePos))!;
        const v = this.nodeMap.get(this.normalizePin(vb.nodeNeg))!;
        const sIdx = nonRefNodes + k;

        if (u > 0) {
          A[n2m(u)][sIdx] += 1;
          A[sIdx][n2m(u)] += 1;
        }
        if (v > 0) {
          A[n2m(v)][sIdx] -= 1;
          A[sIdx][n2m(v)] -= 1;
        }
        z[sIdx] = vb.value;
      }

      const solution = this.solveGaussian(A, z);
      const currentVoltages = new Map<string, number>();
      currentVoltages.set(this.normalizePin(this.groundPin), 0.0);

      for (let n = 1; n <= nonRefNodes; n++) {
        const pinName = this.reverseNodeMap.get(n)!;
        currentVoltages.set(pinName, solution[n2m(n)]);
      }

      // Check diode state stability
      let stateChanged = false;
      let hasDiodes = false;

      for (const b of activeBranches) {
        if (b.type === 'DIODE' || b.type === 'LED') {
          hasDiodes = true;
          const u = this.normalizePin(b.nodePos);
          const v = this.normalizePin(b.nodeNeg);
          const vDrop = (currentVoltages.get(u) || 0) - (currentVoltages.get(v) || 0);
          const Vf = b.type === 'LED' ? (b.value || 1.8) : (b.value || 0.7);

          const newState = vDrop >= Vf;
          const oldState = diodeStates.get(b.id);
          if (newState !== oldState) {
            diodeStates.set(b.id, newState);
            stateChanged = true;
          }
        }
      }

      nodeVoltages = currentVoltages;

      if (!hasDiodes || !stateChanged) {
        converged = true;
      }

      branchCurrents.clear();
      branchPowers.clear();

      for (let k = 0; k < m; k++) {
        const vb = vSources[k];
        const current = solution[nonRefNodes + k];
        branchCurrents.set(vb.id, current);
        branchPowers.set(vb.id, -current * vb.value);
      }

      for (const b of activeBranches) {
        if (b.type === 'VOLTAGE_SOURCE') continue;
        const u = this.normalizePin(b.nodePos);
        const v = this.normalizePin(b.nodeNeg);
        const vu = nodeVoltages.get(u) || 0;
        const vv = nodeVoltages.get(v) || 0;
        const vDrop = vu - vv;

        if (b.type === 'RESISTOR' || b.type === 'WIRE') {
          const r = b.type === 'WIRE' ? 1e-4 : Math.max(b.value, 1e-5);
          const cur = vDrop / r;
          branchCurrents.set(b.id, cur);
          branchPowers.set(b.id, cur * vDrop);
        } else if (b.type === 'CURRENT_SOURCE') {
          branchCurrents.set(b.id, b.value);
          branchPowers.set(b.id, b.value * vDrop);
        } else if (b.type === 'DIODE' || b.type === 'LED') {
          const Vf = b.type === 'LED' ? (b.value || 1.8) : (b.value || 0.7);
          const rf = 15.0;
          const rrev = 1e6;
          const cur = vDrop >= Vf ? (vDrop - Vf) / rf : vDrop / rrev;
          branchCurrents.set(b.id, cur);
          branchPowers.set(b.id, cur * vDrop);
          b.state = cur > 0.002;
        }
      }
    }

    let totalPower = 0;
    let maxV = -Infinity;
    let minV = Infinity;
    let shortDetected = false;

    for (const [_, p] of branchPowers.entries()) {
      if (p > 0) totalPower += p;
    }
    for (const [_, v] of nodeVoltages.entries()) {
      if (v > maxV) maxV = v;
      if (v < minV) minV = v;
    }
    for (const [_, i] of branchCurrents.entries()) {
      if (Math.abs(i) > 5.0) shortDetected = true;
    }

    return {
      converged,
      iterations: iter,
      nodeVoltages,
      branchCurrents,
      branchPowers,
      summary: {
        totalPowerConsumed: totalPower,
        maxVoltage: maxV === -Infinity ? 0 : maxV,
        minVoltage: minV === Infinity ? 0 : minV,
        shortCircuitDetected: shortDetected,
        openCircuitNodes: []
      }
    };
  }

  private solveGaussian(A: number[][], b: number[]): number[] {
    const n = b.length;
    const M: number[][] = Array.from({ length: n }, (_, i) => [...A[i], b[i]]);

    for (let p = 0; p < n; p++) {
      let maxRow = p;
      let maxVal = Math.abs(M[p][p]);
      for (let r = p + 1; r < n; r++) {
        if (Math.abs(M[r][p]) > maxVal) {
          maxVal = Math.abs(M[r][p]);
          maxRow = r;
        }
      }

      if (maxVal < 1e-12) {
        M[p][p] += 1e-9;
      } else if (maxRow !== p) {
        const tmp = M[p];
        M[p] = M[maxRow];
        M[maxRow] = tmp;
      }

      for (let r = p + 1; r < n; r++) {
        const factor = M[r][p] / M[p][p];
        if (Math.abs(factor) > 1e-15) {
          for (let c = p; c <= n; c++) {
            M[r][c] -= factor * M[p][c];
          }
        }
      }
    }

    const x = Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let sum = M[r][n];
      for (let c = r + 1; c < n; c++) {
        sum -= M[r][c] * x[c];
      }
      x[r] = sum / (Math.abs(M[r][r]) < 1e-12 ? 1e-9 : M[r][r]);
    }
    return x;
  }
}
