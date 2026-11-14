/**
 * OhmSight AR - BreadboardNodalSolver.ts
 * Lens Studio Component for Snap Spectacles
 * 
 * Manages breadboard spatial topology, node indexing, component registration,
 * and high-frequency Modified Nodal Analysis (MNA) execution.
 */

import { MNAEngine, CircuitBranch, SolveResult, ComponentType } from "./MNAEngine";

// Lens Studio component decorator definition
// When running in Lens Studio preview or on Spectacles hardware:
declare const component: any;
declare const input: any;

export interface BreadboardPinLocation {
  column: string; // 'A'..'J' or '+T','-T','+B','-B'
  row: number;    // 1..30 or 1..63
  localPos: { x: number; y: number; z: number };
}

export interface PlacedComponent {
  id: string;
  name: string;
  type: ComponentType;
  pinA: string;
  pinB: string;
  nominalValue: number;
  unit: string;
  colorBand?: string[];
  visualObject?: any;
}

@component
export class BreadboardNodalSolver extends BaseScriptComponent {
  @input
  public updateRateHz: number = 30.0;

  @input
  public defaultGroundPin: string = "-T";

  @input
  public autoSolveOnComponentChange: boolean = true;

  @input
  public enableSoundFeedback: boolean = true;

  private engine: MNAEngine;
  private placedComponents: Map<string, PlacedComponent> = new Map();
  private lastSolveResult: SolveResult | null = null;
  private timeSinceLastSolve: number = 0;
  private isDirty: boolean = true;

  // Breadboard 3D pitch constants (Standard 0.1" / 2.54mm pitch)
  public static readonly PIN_PITCH_MM: number = 2.54;
  public static readonly BREADBOARD_ROWS: number = 30; // standard half-size
  public static readonly CENTER_TROUGH_MM: number = 7.62;

  onAwake(): void {
    this.engine = new MNAEngine(this.defaultGroundPin);
    this.loadDefaultDemoCircuit();
    this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    print("[OhmSight AR] BreadboardNodalSolver initialized on Snap Spectacles.");
  }

  /**
   * Loads an introductory voltage divider + LED circuit preset for immediate spatial tutorial
   */
  public loadDefaultDemoCircuit(): void {
    this.engine.clear();
    this.placedComponents.clear();

    // 1. DC 5V Power Supply (+T to -T)
    this.addComponent({
      id: "vsource_5v",
      name: "5.0V Regulated Supply",
      type: "VOLTAGE_SOURCE",
      pinA: "+T",
      pinB: "-T",
      nominalValue: 5.0,
      unit: "V"
    });

    // 2. Jumper Wire from +T to Row 1 Left (A1)
    this.addComponent({
      id: "wire_power",
      name: "VCC Rail Jumper",
      type: "WIRE",
      pinA: "+T",
      pinB: "A1",
      nominalValue: 0.0001,
      unit: "Ω"
    });

    // 3. Resistor R1 (10 kΩ) from Row 1 Left (B1) to Row 10 Left (A10)
    this.addComponent({
      id: "r1_divider",
      name: "R1 (10 kΩ Divider)",
      type: "RESISTOR",
      pinA: "B1",
      pinB: "A10",
      nominalValue: 10000.0,
      unit: "Ω",
      colorBand: ["#8B4513", "#000000", "#FFA500", "#FFD700"] // Brown, Black, Orange, Gold
    });

    // 4. Resistor R2 (10 kΩ) from Row 10 Left (B10) to Ground Rail (-T)
    this.addComponent({
      id: "r2_divider",
      name: "R2 (10 kΩ Divider)",
      type: "RESISTOR",
      pinA: "B10",
      pinB: "-T",
      nominalValue: 10000.0,
      unit: "Ω",
      colorBand: ["#8B4513", "#000000", "#FFA500", "#FFD700"]
    });

    // 5. Current-limiting resistor (220 Ω) from Row 1 Left (C1) to Row 20 Left (A20)
    this.addComponent({
      id: "r_led",
      name: "R_limit (220 Ω)",
      type: "RESISTOR",
      pinA: "C1",
      pinB: "A20",
      nominalValue: 220.0,
      unit: "Ω",
      colorBand: ["#FF0000", "#FF0000", "#8B4513", "#FFD700"] // Red, Red, Brown, Gold
    });

    // 6. Red Indicator LED from Row 20 Left (B20) to Ground (-T)
    this.addComponent({
      id: "led_red",
      name: "Status LED (Red)",
      type: "LED",
      pinA: "B20",
      pinB: "-T",
      nominalValue: 1.8, // Forward voltage Vf ~ 1.8V
      unit: "V"
    });

    this.isDirty = true;
    this.solveCircuit();
  }

  public addComponent(comp: PlacedComponent): void {
    this.placedComponents.set(comp.id, comp);
    this.engine.addBranch({
      id: comp.id,
      name: comp.name,
      type: comp.type,
      nodePos: comp.pinA,
      nodeNeg: comp.pinB,
      value: comp.nominalValue
    });
    this.isDirty = true;
  }

  public removeComponent(id: string): void {
    if (this.placedComponents.delete(id)) {
      this.rebuildEngineBranches();
      this.isDirty = true;
    }
  }

  private rebuildEngineBranches(): void {
    this.engine.clear();
    for (const comp of this.placedComponents.values()) {
      this.engine.addBranch({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        nodePos: comp.pinA,
        nodeNeg: comp.pinB,
        value: comp.nominalValue
      });
    }
  }

  public solveCircuit(): SolveResult {
    const result = this.engine.solve();
    this.lastSolveResult = result;
    this.isDirty = false;
    return result;
  }

  public getLastSolveResult(): SolveResult | null {
    return this.lastSolveResult;
  }

  /**
   * Returns potential at a given physical breadboard pin
   */
  public getPinVoltage(pin: string): number {
    if (!this.lastSolveResult) return 0;
    const norm = this.engine.normalizePin(pin);
    return this.lastSolveResult.nodeVoltages.get(norm) ?? 0.0;
  }

  /**
   * Returns branch current flowing through a placed component
   */
  public getComponentCurrent(id: string): number {
    if (!this.lastSolveResult) return 0;
    return this.lastSolveResult.branchCurrents.get(id) ?? 0.0;
  }

  /**
   * Maps 3D spatial world/local coordinate to nearest breadboard pin coordinate
   */
  public getNearestPin(localXCm: number, localYCm: number): string {
    // Standard layout: X is row direction (1..30), Y is column direction (A..J)
    // Pitch ~ 0.254 cm
    const row = Math.round(localXCm / 0.254);
    const clampedRow = Math.max(1, Math.min(row, BreadboardNodalSolver.BREADBOARD_ROWS));

    // Power rails are at Y extremes
    if (localYCm > 2.5) return "+T";
    if (localYCm > 1.8) return "-T";
    if (localYCm < -2.5) return "-B";
    if (localYCm < -1.8) return "+B";

    // Columns A..E (Top half) or F..J (Bottom half)
    if (localYCm >= 0.3) {
      return `C${clampedRow}`;
    } else {
      return `H${clampedRow}`;
    }
  }

  /**
   * Calculates differential voltage between two probed pins
   */
  public measureDifferentialVoltage(pinA: string, pinB: string): {
    vDiff: number;
    vA: number;
    vB: number;
    pinANorm: string;
    pinBNorm: string;
    isEquipotential: boolean;
  } {
    const vA = this.getPinVoltage(pinA);
    const vB = this.getPinVoltage(pinB);
    const vDiff = vA - vB;
    const pinANorm = this.engine.normalizePin(pinA);
    const pinBNorm = this.engine.normalizePin(pinB);

    return {
      vDiff,
      vA,
      vB,
      pinANorm,
      pinBNorm,
      isEquipotential: pinANorm === pinBNorm
    };
  }

  private onUpdate(): void {
    const dt = getDeltaTime();
    this.timeSinceLastSolve += dt;

    const interval = 1.0 / Math.max(this.updateRateHz, 1.0);
    if (this.timeSinceLastSolve >= interval) {
      this.timeSinceLastSolve = 0;
      if (this.isDirty || this.autoSolveOnComponentChange) {
        this.solveCircuit();
      }
    }
  }
}
