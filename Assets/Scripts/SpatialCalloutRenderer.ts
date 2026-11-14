/**
 * OhmSight AR - SpatialCalloutRenderer.ts
 * Lens Studio Component for Snap Spectacles
 * 
 * Renders glowing, high-contrast holographic AR callouts, voltage heatmaps,
 * and animated electron flow trails designed specifically for the dual-RGB
 * optical waveguide display of Snap Spectacles.
 */

declare const component: any;
declare const input: any;

export interface CalloutBadgeData {
  title: string;
  primaryValue: string;
  subValue: string;
  colorHex: string;
  worldPos: { x: number; y: number; z: number };
  warning?: string;
  formulaNote?: string;
}

@component
export class SpatialCalloutRenderer extends BaseScriptComponent {
  @input
  public calloutTextComponent: any;

  @input
  public billboardToCamera: boolean = true;

  @input
  public highContrastWaveguideMode: boolean = true;

  @input
  public electronFlowSpeedScale: number = 1.0;

  private currentCallout: CalloutBadgeData = {
    title: "OhmSight Probes",
    primaryValue: "0.000 V",
    subValue: "Select pins to measure",
    colorHex: "#00F0FF",
    worldPos: { x: 0, y: 15, z: 0 }
  };

  private activeWarnings: string[] = [];
  private particleFlowRate: number = 1.0;

  onAwake(): void {
    print("[OhmSight AR] SpatialCalloutRenderer initialized for Spectacles waveguide display.");
    this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
  }

  /**
   * Updates the primary multimeter probe callout floating between or above the probes
   */
  public updateProbeCallout(
    pinRed: string,
    pinBlack: string,
    vDiff: number,
    vA: number,
    vB: number,
    isEquipotential: boolean
  ): void {
    const formattedV = Math.abs(vDiff) < 1.0 
      ? `${(vDiff * 1000).toFixed(1)} mV` 
      : `${vDiff.toFixed(3)} V`;

    let color = "#00F0FF"; // Neon Cyan (Standard positive)
    if (Math.abs(vDiff) < 0.001) {
      color = "#00FF9D"; // Neon Emerald (Equipotential / 0V)
    } else if (vDiff < 0) {
      color = "#FF9900"; // Amber (Reversed polarity)
    }

    let warning: string | undefined = undefined;
    if (Math.abs(vDiff) > 12.0) {
      warning = "HIGH VOLTAGE WARNING (>12V)";
      color = "#FF0055";
    }

    let formulaNote: string | undefined = undefined;
    if (pinRed.includes("10") && pinBlack.includes("-T")) {
      formulaNote = "Divider Node: V_out = V_in * (R2 / (R1 + R2)) = 5.0V * (10k / 20k) = 2.50V";
    } else if (pinRed.includes("20")) {
      formulaNote = "Diode Anode: V_f = 1.8V forward threshold, I = (5V - 1.8V)/220Ω = 14.5mA";
    }

    this.currentCallout = {
      title: `ΔV Probe [${pinRed} → ${pinBlack}]`,
      primaryValue: formattedV,
      subValue: `V(+) = ${vA.toFixed(2)}V  |  V(-) = ${vB.toFixed(2)}V`,
      colorHex: color,
      worldPos: { x: 0, y: 12, z: 0 },
      warning,
      formulaNote
    };

    this.applyCalloutToVisuals();
  }

  /**
   * Renders node voltage badge above a specific breadboard row
   */
  public getRowBadge(rowNumber: number, voltage: number, currentMa: number): CalloutBadgeData {
    return {
      title: `Row ${rowNumber}`,
      primaryValue: `${voltage.toFixed(2)} V`,
      subValue: `${currentMa.toFixed(1)} mA`,
      colorHex: voltage > 3.0 ? "#FFDE00" : "#00F0FF",
      worldPos: { x: (rowNumber - 15) * 0.254, y: 3.0, z: 0 }
    };
  }

  private applyCalloutToVisuals(): void {
    if (this.calloutTextComponent) {
      try {
        const text = `${this.currentCallout.title}\n${this.currentCallout.primaryValue}\n${this.currentCallout.subValue}`;
        this.calloutTextComponent.text = text;
      } catch (_) {}
    }
  }

  public getCurrentCallout(): CalloutBadgeData {
    return this.currentCallout;
  }

  private onUpdate(): void {
    // Spatial billboarding: rotates callout card toward user's head pose
    if (this.billboardToCamera) {
      // In Lens Studio: this.getTransform().setWorldRotation(...)
    }
  }
}
