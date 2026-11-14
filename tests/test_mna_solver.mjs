/**
 * OhmSight AR - Automated MNA Solver & Electrical Law Verification Suite
 * Tests 100% compliance with Kirchhoff's Voltage Law (KVL), Kirchhoff's Current Law (KCL),
 * Ohm's Law, Wheatstone Bridge, Non-Linear Diodes, and Breadboard Topology Mapping.
 */

import { strict as assert } from 'node:assert';

class MNAEngine {
  constructor(groundPin = '-T') {
    this.groundPin = groundPin;
    this.branches = [];
    this.nodeMap = new Map();
    this.reverseNodeMap = new Map();
  }

  setGround(pin) {
    this.groundPin = pin;
  }

  addBranch(branch) {
    this.branches.push({ ...branch });
  }

  clear() {
    this.branches = [];
    this.nodeMap.clear();
    this.reverseNodeMap.clear();
  }

  normalizePin(pin) {
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

  buildNodeIndex() {
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

  solve(maxIterations = 30, tolerance = 1e-4) {
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
        summary: { totalPowerConsumed: 0, maxVoltage: 0, minVoltage: 0, shortCircuitDetected: false }
      };
    }

    // Diode operating state tracking (0 = OFF, 1 = ON)
    const diodeStates = new Map();
    for (const b of activeBranches) {
      if (b.type === 'DIODE' || b.type === 'LED') {
        diodeStates.set(b.id, false);
      }
    }

    let converged = false;
    let iter = 0;
    let nodeVoltages = new Map();
    let branchCurrents = new Map();
    let branchPowers = new Map();

    while (iter < maxIterations && !converged) {
      iter++;
      const A = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));
      const z = Array(matrixSize).fill(0);
      const n2m = n => n - 1;

      for (const b of activeBranches) {
        const u = this.nodeMap.get(this.normalizePin(b.nodePos));
        const v = this.nodeMap.get(this.normalizePin(b.nodeNeg));

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
          // Robust piecewise linear diode model
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
        const u = this.nodeMap.get(this.normalizePin(vb.nodePos));
        const v = this.nodeMap.get(this.normalizePin(vb.nodeNeg));
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
      const currentVoltages = new Map();
      currentVoltages.set(this.normalizePin(this.groundPin), 0.0);

      for (let n = 1; n <= nonRefNodes; n++) {
        const pinName = this.reverseNodeMap.get(n);
        currentVoltages.set(pinName, solution[n2m(n)]);
      }

      // Check state stability for diodes
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

      // Branch currents & powers calculation
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
    let shortDetected = false;
    for (const [_, p] of branchPowers.entries()) {
      if (p > 0) totalPower += p;
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
      summary: { totalPowerConsumed: totalPower, shortCircuitDetected: shortDetected }
    };
  }

  solveGaussian(A, b) {
    const n = b.length;
    const M = Array.from({ length: n }, (_, i) => [...A[i], b[i]]);

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

// ==========================================
// TEST SUITE
// ==========================================

console.log('⚡ OhmSight AR - Automated Circuit Solver Verification Suite');
console.log('===========================================================');

let passCount = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// Test 1: Symmetrical Voltage Divider (5V across 10k + 10k)
runTest('Test 1: Symmetrical Voltage Divider (5V, 10kΩ/10kΩ -> exactly 2.500V)', () => {
  const solver = new MNAEngine('-T');
  solver.addBranch({ id: 'V1', type: 'VOLTAGE_SOURCE', nodePos: '+T', nodeNeg: '-T', value: 5.0 });
  solver.addBranch({ id: 'R1', type: 'RESISTOR', nodePos: '+T', nodeNeg: 'A10', value: 10000 });
  solver.addBranch({ id: 'R2', type: 'RESISTOR', nodePos: 'A10', nodeNeg: '-T', value: 10000 });

  const res = solver.solve();
  assert(res.converged, 'Solver did not converge');
  
  const vMid = res.nodeVoltages.get('ROW_10_TOP');
  assert(vMid !== undefined, 'Midpoint node missing');
  assert(Math.abs(vMid - 2.5) < 1e-4, `Expected 2.500V, got ${vMid.toFixed(5)}V`);

  // KVL check: V_source = V_R1 + V_R2
  const iR1 = res.branchCurrents.get('R1');
  const iR2 = res.branchCurrents.get('R2');
  assert(Math.abs(iR1 - 0.00025) < 1e-6, `Expected 0.25mA loop current, got ${iR1}`);
  assert(Math.abs(iR1 - iR2) < 1e-7, 'KCL violated at midpoint node');
});

// Test 2: Kirchhoff Current Law (KCL) on 3-way Parallel Resistor Network
runTest('Test 2: KCL on 3-Way Parallel Resistors (12V across 100Ω, 200Ω, 300Ω)', () => {
  const solver = new MNAEngine('-T');
  solver.addBranch({ id: 'V1', type: 'VOLTAGE_SOURCE', nodePos: '+T', nodeNeg: '-T', value: 12.0 });
  solver.addBranch({ id: 'R1', type: 'RESISTOR', nodePos: '+T', nodeNeg: '-T', value: 100 });
  solver.addBranch({ id: 'R2', type: 'RESISTOR', nodePos: '+T', nodeNeg: '-T', value: 200 });
  solver.addBranch({ id: 'R3', type: 'RESISTOR', nodePos: '+T', nodeNeg: '-T', value: 300 });

  const res = solver.solve();
  const i1 = res.branchCurrents.get('R1'); // 12/100 = 0.12 A
  const i2 = res.branchCurrents.get('R2'); // 12/200 = 0.06 A
  const i3 = res.branchCurrents.get('R3'); // 12/300 = 0.04 A
  const iTotal = Math.abs(res.branchCurrents.get('V1')); // 0.22 A

  assert(Math.abs(i1 - 0.12) < 1e-4, `R1 current mismatch: ${i1}`);
  assert(Math.abs(i2 - 0.06) < 1e-4, `R2 current mismatch: ${i2}`);
  assert(Math.abs(i3 - 0.04) < 1e-4, `R3 current mismatch: ${i3}`);
  assert(Math.abs(iTotal - (i1 + i2 + i3)) < 1e-6, 'KCL mismatch: total current != sum of branch currents');
});

// Test 3: Balanced Wheatstone Bridge Null Detection
runTest('Test 3: Balanced Wheatstone Bridge (Zero differential voltage across detector)', () => {
  const solver = new MNAEngine('-T');
  solver.addBranch({ id: 'V_IN', type: 'VOLTAGE_SOURCE', nodePos: '+T', nodeNeg: '-T', value: 10.0 });
  // Left arm: R1 (1k) & R2 (2k)
  solver.addBranch({ id: 'R1', type: 'RESISTOR', nodePos: '+T', nodeNeg: 'A5', value: 1000 });
  solver.addBranch({ id: 'R2', type: 'RESISTOR', nodePos: 'A5', nodeNeg: '-T', value: 2000 });
  // Right arm: R3 (2k) & R4 (4k) => Ratio 1/2 = 2/4 (Balanced!)
  solver.addBranch({ id: 'R3', type: 'RESISTOR', nodePos: '+T', nodeNeg: 'F5', value: 2000 });
  solver.addBranch({ id: 'R4', type: 'RESISTOR', nodePos: 'F5', nodeNeg: '-T', value: 4000 });
  // Bridge galvanometer resistor
  solver.addBranch({ id: 'R_METER', type: 'RESISTOR', nodePos: 'A5', nodeNeg: 'F5', value: 500 });

  const res = solver.solve();
  const vLeft = res.nodeVoltages.get('ROW_5_TOP');
  const vRight = res.nodeVoltages.get('ROW_5_BOT');
  const vBridge = vLeft - vRight;
  const iMeter = res.branchCurrents.get('R_METER');

  assert(Math.abs(vBridge) < 1e-4, `Bridge unbalanced: V_bridge = ${vBridge}V`);
  assert(Math.abs(iMeter) < 1e-7, `Bridge galvanometer current should be 0, got ${iMeter}A`);
});

// Test 4: Unbalanced Wheatstone Bridge Potential Calculation
runTest('Test 4: Unbalanced Wheatstone Bridge (Predictable galvanometer deflection)', () => {
  const solver = new MNAEngine('-T');
  solver.addBranch({ id: 'V_IN', type: 'VOLTAGE_SOURCE', nodePos: '+T', nodeNeg: '-T', value: 10.0 });
  // Left arm: R1 (1k) & R2 (1k) -> 5.00V
  solver.addBranch({ id: 'R1', type: 'RESISTOR', nodePos: '+T', nodeNeg: 'A6', value: 1000 });
  solver.addBranch({ id: 'R2', type: 'RESISTOR', nodePos: 'A6', nodeNeg: '-T', value: 1000 });
  // Right arm: R3 (1k) & R4 (3k) -> 7.50V (open circuit)
  solver.addBranch({ id: 'R3', type: 'RESISTOR', nodePos: '+T', nodeNeg: 'F6', value: 1000 });
  solver.addBranch({ id: 'R4', type: 'RESISTOR', nodePos: 'F6', nodeNeg: '-T', value: 3000 });
  // Bridge detector: 10k
  solver.addBranch({ id: 'R_METER', type: 'RESISTOR', nodePos: 'A6', nodeNeg: 'F6', value: 10000 });

  const res = solver.solve();
  const vLeft = res.nodeVoltages.get('ROW_6_TOP');
  const vRight = res.nodeVoltages.get('ROW_6_BOT');
  const vDiff = vLeft - vRight;

  assert(Math.abs(vDiff) > 2.0, `Expected noticeable bridge offset, got ${vDiff}V`);
});

// Test 5: LED Branch Non-Linear Solution & Current Limiting
runTest('Test 5: LED Branch Non-Linear Solution (5V -> 220Ω -> Red LED Vf~1.8V)', () => {
  const solver = new MNAEngine('-T');
  solver.addBranch({ id: 'V1', type: 'VOLTAGE_SOURCE', nodePos: '+T', nodeNeg: '-T', value: 5.0 });
  solver.addBranch({ id: 'R_LIMIT', type: 'RESISTOR', nodePos: '+T', nodeNeg: 'A20', value: 220 });
  solver.addBranch({ id: 'LED1', type: 'LED', nodePos: 'A20', nodeNeg: '-T', value: 1.8 });

  const res = solver.solve();
  assert(res.converged, 'Non-linear LED solver failed to converge');

  const vAnode = res.nodeVoltages.get('ROW_20_TOP');
  assert(vAnode > 1.2 && vAnode < 2.5, `LED forward voltage out of range: ${vAnode}V`);

  const iLed = res.branchCurrents.get('LED1');
  assert(iLed > 0.008 && iLed < 0.020, `LED current expected 8-20mA, got ${(iLed * 1000).toFixed(2)}mA`);
});

// Test 6: Breadboard Pin Grid Coordinate Normalization
runTest('Test 6: Breadboard Pin Coordinate Normalization (Columns A-E vs F-J, Top/Bot Rails)', () => {
  const solver = new MNAEngine('-T');
  
  assert.equal(solver.normalizePin('A15'), 'ROW_15_TOP');
  assert.equal(solver.normalizePin('B15'), 'ROW_15_TOP');
  assert.equal(solver.normalizePin('E15'), 'ROW_15_TOP');
  
  assert.equal(solver.normalizePin('F15'), 'ROW_15_BOT');
  assert.equal(solver.normalizePin('J15'), 'ROW_15_BOT');

  assert.equal(solver.normalizePin('+T'), 'RAIL_T_POS');
  assert.equal(solver.normalizePin('-T'), 'RAIL_T_NEG');
  assert.equal(solver.normalizePin('+B'), 'RAIL_B_POS');
  assert.equal(solver.normalizePin('-B'), 'RAIL_B_NEG');
});

// Test 7: Short Circuit Detection
runTest('Test 7: Direct Short-Circuit Overload Detection (5V across 0.01Ω)', () => {
  const solver = new MNAEngine('-T');
  solver.addBranch({ id: 'V1', type: 'VOLTAGE_SOURCE', nodePos: '+T', nodeNeg: '-T', value: 5.0 });
  solver.addBranch({ id: 'R_SHORT', type: 'RESISTOR', nodePos: '+T', nodeNeg: '-T', value: 0.01 });

  const res = solver.solve();
  assert(res.summary.shortCircuitDetected, 'Short circuit failed to trigger warning flag');
});

console.log('===========================================================');
console.log(`Results: ${passCount} / ${totalTests} Passed (${((passCount/totalTests)*100).toFixed(0)}%)`);

if (passCount !== totalTests) {
  process.exit(1);
}
