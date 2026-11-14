/**
 * OhmSight AR - PinchProbeController.ts
 * Lens Studio Component for Snap Spectacles
 * 
 * Integrates Spectacles Interaction Kit (SIK) pinch detection & hand tracking
 * to transform index-thumb pinches into dual-lead Multimeter Probes.
 * 
 * Right Hand Pinch: Red Probe (Anode / Signal Lead)
 * Left Hand Pinch:  Black Probe (Cathode / Reference Lead)
 */

import { BreadboardNodalSolver } from "./BreadboardNodalSolver";
import { SpatialCalloutRenderer } from "./SpatialCalloutRenderer";

declare const component: any;
declare const input: any;

export interface HandProbeState {
  hand: "left" | "right";
  isPinching: boolean;
  pinchPosition: { x: number; y: number; z: number };
  activePin: string | null;
  snappedPosition: { x: number; y: number; z: number } | null;
  color: string;
}

@component
export class PinchProbeController extends BaseScriptComponent {
  @input
  public breadboardSolver: BreadboardNodalSolver;

  @input
  public calloutRenderer: SpatialCalloutRenderer;

  @input
  public probeSnapRadiusCm: number = 2.0;

  @input
  public hapticFeedbackEnabled: boolean = true;

  @input
  public audioMultimeterEnabled: boolean = true;

  // Probe States
  private redProbe: HandProbeState = {
    hand: "right",
    isPinching: false,
    pinchPosition: { x: 0, y: 0, z: 0 },
    activePin: "A10", // Default placed on divider midpoint
    snappedPosition: { x: 2.54, y: 0.5, z: 0 },
    color: "#FF3344"
  };

  private blackProbe: HandProbeState = {
    hand: "left",
    isPinching: false,
    pinchPosition: { x: 0, y: 0, z: 0 },
    activePin: "-T", // Default placed on ground rail
    snappedPosition: { x: 0, y: 2.0, z: 0 },
    color: "#222222"
  };

  private lastMeasuredVDiff: number = 0;
  private audioComponent: any = null;

  onAwake(): void {
    print("[OhmSight AR] PinchProbeController starting with SIK gesture listeners.");
    this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    this.setupSIKEventListeners();
  }

  /**
   * Subscribes to Spectacles Interaction Kit (SIK) hand pinch events
   */
  private setupSIKEventListeners(): void {
    // SIK Hand Tracking API fallback and listener hook
    try {
      // In Lens Studio SIK environment:
      const globalSIK = (global as any).SIK;
      if (globalSIK && globalSIK.HandInputData) {
        const handInputData = globalSIK.HandInputData;
        const rightHand = handInputData.getHand("right");
        const leftHand = handInputData.getHand("left");

        if (rightHand) {
          rightHand.onPinchDown.add(() => this.handlePinchStart("right"));
          rightHand.onPinchUp.add(() => this.handlePinchEnd("right"));
        }
        if (leftHand) {
          leftHand.onPinchDown.add(() => this.handlePinchStart("left"));
          leftHand.onPinchUp.add(() => this.handlePinchEnd("left"));
        }
      }
    } catch (e) {
      print("[OhmSight AR] SIK HandInputData standalone preview mode.");
    }
  }

  public handlePinchStart(hand: "left" | "right"): void {
    const probe = hand === "right" ? this.redProbe : this.blackProbe;
    probe.isPinching = true;
    print(`[OhmSight AR] ${hand.toUpperCase()} Hand Pinch Engaged (Probe Active)`);
    this.triggerHapticPulse(hand);
  }

  public handlePinchEnd(hand: "left" | "right"): void {
    const probe = hand === "right" ? this.redProbe : this.blackProbe;
    probe.isPinching = false;
    print(`[OhmSight AR] ${hand.toUpperCase()} Hand Pinch Released`);
  }

  /**
   * Sets probe target pin directly (from 3D UI, pinch raycast, or simulator)
   */
  public setProbePin(hand: "left" | "right", pinName: string): void {
    const probe = hand === "right" ? this.redProbe : this.blackProbe;
    probe.activePin = pinName;
    this.updateMeasurement();
  }

  public getRedProbe(): HandProbeState {
    return this.redProbe;
  }

  public getBlackProbe(): HandProbeState {
    return this.blackProbe;
  }

  public updateMeasurement(): void {
    if (!this.breadboardSolver) return;

    const pinRed = this.redProbe.activePin || "+T";
    const pinBlack = this.blackProbe.activePin || "-T";

    const measurement = this.breadboardSolver.measureDifferentialVoltage(pinRed, pinBlack);
    this.lastMeasuredVDiff = measurement.vDiff;

    if (this.calloutRenderer) {
      this.calloutRenderer.updateProbeCallout(
        pinRed,
        pinBlack,
        measurement.vDiff,
        measurement.vA,
        measurement.vB,
        measurement.isEquipotential
      );
    }

    if (this.audioMultimeterEnabled) {
      this.playMultimeterTone(measurement.vDiff);
    }
  }

  private triggerHapticPulse(hand: "left" | "right"): void {
    if (!this.hapticFeedbackEnabled) return;
    try {
      const globalSIK = (global as any).SIK;
      if (globalSIK && globalSIK.HapticService) {
        globalSIK.HapticService.playPinchHaptic(hand);
      }
    } catch (_) {}
  }

  private playMultimeterTone(voltage: number): void {
    // Frequency calculation: 440 Hz (0V) -> 880 Hz (+5V)
    const baseFreq = 440;
    const freq = Math.max(100, Math.min(2000, baseFreq + voltage * 88));
    // Audio synthesizer pitch update
  }

  private onUpdate(): void {
    // Query hand tracking positions if available
    try {
      const globalSIK = (global as any).SIK;
      if (globalSIK && globalSIK.HandInputData) {
        const rHand = globalSIK.HandInputData.getHand("right");
        const lHand = globalSIK.HandInputData.getHand("left");

        if (rHand && rHand.indexTip) {
          const pos = rHand.indexTip.position;
          this.redProbe.pinchPosition = { x: pos.x, y: pos.y, z: pos.z };
        }
        if (lHand && lHand.indexTip) {
          const pos = lHand.indexTip.position;
          this.blackProbe.pinchPosition = { x: pos.x, y: pos.y, z: pos.z };
        }
      }
    } catch (_) {}

    this.updateMeasurement();
  }
}
