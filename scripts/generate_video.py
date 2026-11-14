import os
import sys
import shutil
import subprocess
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Dynamic resolution of ffmpeg binary with environment/PATH fallback
FFMPEG_PATH = os.environ.get("FFMPEG_BIN") or shutil.which("ffmpeg") or "ffmpeg"
OUT_VIDEO = os.path.abspath("assets/demo_specs_1080p.mp4")
W, H = 1920, 1080
FPS = 30
DURATION_SEC = 40
TOTAL_FRAMES = FPS * DURATION_SEC # 1200 frames

print(f"Generating {DURATION_SEC}s 1080p video ({TOTAL_FRAMES} frames)...")

# Generate synthetic audio tone track using numpy and wave
import wave

AUDIO_PATH = os.path.abspath("assets/temp_audio.wav")
SAMPLE_RATE = 44100
total_audio_samples = SAMPLE_RATE * DURATION_SEC
audio_data = np.zeros(total_audio_samples, dtype=np.float32)

# Audio timeline:
# 0-8s: Low tech hum (220 Hz)
# 8-18s: 2.5V probe tone (550 Hz)
# 18-28s: 1.8V LED tone (480 Hz) + high pulse
# 28-35s: Null balance (440 Hz -> 0 tone)
# 35-40s: Outro chime
t_arr = np.linspace(0, DURATION_SEC, total_audio_samples, endpoint=False)
for idx, t in enumerate(t_arr):
    if t < 8.0:
        freq = 220 + 20 * math.sin(2 * math.pi * 0.5 * t)
        vol = 0.15
    elif t < 18.0:
        freq = 550.0 # 2.5V voltage tone
        vol = 0.22
    elif t < 28.0:
        freq = 480.0 + 10 * math.sin(2 * math.pi * 4 * t) # LED conduction
        vol = 0.25
    elif t < 35.0:
        freq = 440.0 # Null balance
        vol = 0.18
    else:
        freq = 880.0 # Success chime
        vol = 0.20
    audio_data[idx] = vol * math.sin(2 * math.pi * freq * t)

# Convert to 16-bit PCM WAV
audio_int16 = (audio_data * 32767).astype(np.int16)
with wave.open(AUDIO_PATH, "w") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes(audio_int16.tobytes())

print("Generated synchronized multimeter audio track.")

# Launch FFmpeg process with stdin pipe
cmd = [
    FFMPEG_PATH,
    "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{W}x{H}",
    "-pix_fmt", "rgb24",
    "-r", str(FPS),
    "-i", "-",
    "-i", AUDIO_PATH,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "fast",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUT_VIDEO
]

proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

# Circuit parameters
bx, by, bw, bh = 360, 420, 1200, 520
cols = 30
col_w = (bw - 120) / cols

for frame_idx in range(TOTAL_FRAMES):
    t = frame_idx / FPS # time in seconds

    img = Image.new("RGB", (W, H), (10, 14, 24))
    draw = ImageDraw.Draw(img)

    # Waveguide HUD Grid
    for gx in range(0, W, 60):
        draw.line([(gx, 0), (gx, H)], fill=(0, 240, 255, 18), width=1)
    for gy in range(0, H, 60):
        draw.line([(0, gy), (W, gy)], fill=(0, 240, 255, 18), width=1)

    # Top Telemetry Header
    draw.rounded_rectangle([30, 20, W - 30, 90], radius=14, fill=(16, 24, 40), outline=(0, 240, 255), width=2)
    draw.text((50, 36), "OhmSight AR", fill=(0, 240, 255))
    draw.text((52, 60), "Snap Spectacles Dual-RGB Waveguide Engine", fill=(255, 220, 0))

    fps_val = 60
    solve_ms = 0.22 + 0.05 * math.sin(t * 3)
    draw.text((W - 750, 42), f"SIK TRACKING: ACTIVE (Dual Pinch)", fill=(0, 255, 160))
    draw.text((W - 750, 64), f"MNA SOLVER: {solve_ms:.2f} ms | FPS: {fps_val}", fill=(180, 210, 255))
    draw.text((W - 320, 50), "Devpost: Learn AR with SPECS", fill=(255, 220, 0))

    # Breadboard Base Graphic
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=24, fill=(24, 32, 50), outline=(0, 240, 255), width=2)
    # Power rails
    draw.line([(bx + 40, by + 40), (bx + bw - 40, by + 40)], fill=(255, 60, 80), width=4) # +V rail
    draw.line([(bx + 40, by + 70), (bx + bw - 40, by + 70)], fill=(0, 160, 255), width=4) # -V rail (GND)
    draw.line([(bx + 40, by + bh - 70), (bx + bw - 40, by + bh - 70)], fill=(255, 60, 80), width=4)
    draw.line([(bx + 40, by + bh - 40), (bx + bw - 40, by + bh - 40)], fill=(0, 160, 255), width=4)
    # Center valley
    draw.rectangle([bx + 30, by + bh//2 - 16, bx + bw - 30, by + bh//2 + 16], fill=(14, 18, 28))

    # Pin Grid
    for c in range(cols):
        cx_pin = bx + 60 + c * col_w
        if c == 0 or (c + 1) % 5 == 0:
            draw.text((cx_pin - 6, by + bh//2 - 12), str(c + 1), fill=(100, 130, 160))
        for r in range(5):
            cy_top = by + 105 + r * 20
            draw.ellipse([cx_pin - 3, cy_top - 3, cx_pin + 3, cy_top + 3], fill=(12, 16, 26))
            cy_bot = by + bh//2 + 35 + r * 20
            draw.ellipse([cx_pin - 3, cy_bot - 3, cx_pin + 3, cy_bot + 3], fill=(12, 16, 26))

    # Scenario Logic based on time t:
    if t < 8.0:
        stage_title = "STAGE 1: SNAP SPECTACLES OPTICAL INITIALIZATION & SIK CALIBRATION"
        card_v = "CALIBRATING..."
        sub_txt = "Detecting Left & Right Index-Thumb Pinch Gestures"
        probe_red_x, probe_red_y = bx + 180, by + 40
        probe_blk_x, probe_blk_y = bx + 180, by + 70
        pwr_txt = "Waiting for circuit placement"
    elif t < 18.0:
        stage_title = "STAGE 2: SPATIAL VOLTAGE DIVIDER PROBING (10kΩ / 10kΩ -> 2.500V)"
        card_v = "2.500 V"
        sub_txt = "V(RED) = 2.500 V   |   V(BLACK) = 0.000 V (GND)"
        pwr_txt = "I(Divider Loop) = 0.250 mA   |   P = 0.625 mW"
        probe_red_x, probe_red_y = bx + 60 + 9 * col_w, by + 105
        probe_blk_x, probe_blk_y = bx + 100, by + 70

        # Draw Divider components
        draw.arc([bx + 60, by + 30, bx + 180, by + 120], 180, 360, fill=(255, 60, 80), width=4)
        draw.line([(bx + 60, by + 125), (bx + 60 + 9 * col_w, by + 125)], fill=(180, 140, 100), width=6)
        draw.line([(bx + 60 + 9 * col_w, by + 145), (bx + 200, by + 70)], fill=(180, 140, 100), width=6)
    elif t < 28.0:
        stage_title = "STAGE 3: NON-LINEAR LED DRIVER & SPATIAL ELECTRON FLOW"
        card_v = "1.800 V"
        sub_txt = "Forward Voltage Vf = 1.80 V   |   Current = 14.54 mA"
        pwr_txt = "R_limit (220Ω) Dissipation = 46.5 mW (SAFE REGION)"
        probe_red_x, probe_red_y = bx + 60 + 19 * col_w, by + 105
        probe_blk_x, probe_blk_y = bx + 100, by + 70

        # Resistor 220 Ohm
        draw.line([(bx + 60, by + 125), (bx + 60 + 19 * col_w, by + 125)], fill=(220, 100, 60), width=6)
        # LED illuminated
        led_pulse = int(220 + 35 * math.sin(t * 8))
        draw.ellipse([bx + 60 + 19 * col_w - 20, by + 165 - 20, bx + 60 + 19 * col_w + 20, by + 165 + 20], fill=(led_pulse, 30, 80))
    elif t < 35.0:
        stage_title = "STAGE 4: WHEATSTONE BRIDGE NULL-BALANCE & OVERCURRENT GUARD"
        card_v = "0.000 V (NULL)"
        sub_txt = "Balanced Bridge: R1/R2 = R3/R4 (1000/2000 = 2000/4000)"
        pwr_txt = "Differential Bridge Current = 0.000 µA | High Precision"
        probe_red_x, probe_red_y = bx + 60 + 9 * col_w, by + 105
        probe_blk_x, probe_blk_y = bx + 60 + 9 * col_w, by + bh//2 + 35
    else:
        stage_title = "STAGE 5: 100% KCL/KVL VERIFIED — DEVPOST LEARN WITH SPECS"
        card_v = "7/7 PASSED"
        sub_txt = "Modified Nodal Analysis (MNA) Engine Fully Converged"
        pwr_txt = "Ready for Snap Spectacles Deployment & Community Learning"
        probe_red_x, probe_red_y = bx + 400, by + 105
        probe_blk_x, probe_blk_y = bx + 200, by + 70

    # Draw Floating Holographic Callout Card
    hx, hy, hw, hh = 60, 120, 620, 270
    draw.rounded_rectangle([hx, hy, hx + hw, hy + hh], radius=18, fill=(12, 22, 38), outline=(0, 240, 255), width=2)
    draw.text((hx + 30, hy + 22), stage_title, fill=(0, 240, 255))
    draw.text((hx + 30, hy + 55), card_v, fill=(255, 255, 255))
    draw.text((hx + 30, hy + 135), sub_txt, fill=(0, 255, 160))
    draw.text((hx + 30, hy + 165), pwr_txt, fill=(255, 220, 0))

    # Formula hint banner
    draw.rounded_rectangle([hx + 30, hy + 200, hx + hw - 30, hy + 245], radius=8, fill=(8, 16, 28), outline=(0, 240, 255))
    draw.text((hx + 45, hy + 215), "SIK Probes: Right Hand Index-Thumb (+) | Left Hand Index-Thumb (-)", fill=(180, 220, 255))

    # Multimeter Probes Needles & Snapped Markers
    # Red Probe
    draw.line([(probe_red_x, probe_red_y), (probe_red_x + 50, probe_red_y - 80)], fill=(255, 40, 80), width=5)
    draw.ellipse([probe_red_x - 10, probe_red_y - 10, probe_red_x + 10, probe_red_y + 10], fill=(255, 40, 80), outline=(255, 255, 255), width=2)
    draw.rounded_rectangle([probe_red_x + 20, probe_red_y - 110, probe_red_x + 140, probe_red_y - 85], radius=6, fill=(255, 40, 80))
    draw.text((probe_red_x + 28, probe_red_y - 105), "RED PROBE (+)", fill=(255, 255, 255))

    # Black Probe
    draw.line([(probe_blk_x, probe_blk_y), (probe_blk_x - 50, probe_blk_y - 80)], fill=(50, 60, 80), width=5)
    draw.ellipse([probe_blk_x - 10, probe_blk_y - 10, probe_blk_x + 10, probe_blk_y + 10], fill=(20, 30, 45), outline=(0, 240, 255), width=2)
    draw.rounded_rectangle([probe_blk_x - 140, probe_blk_y - 110, probe_blk_x - 20, probe_blk_y - 85], radius=6, fill=(20, 30, 45), outline=(0, 240, 255))
    draw.text((probe_blk_x - 132, probe_blk_y - 105), "BLACK PROBE (-)", fill=(0, 240, 255))

    # Animated electron particles along active conductor
    p_phase = (t * 4) % 1.0
    for p_offset in [0.0, 0.25, 0.5, 0.75]:
        frac = (p_phase + p_offset) % 1.0
        part_x = bx + 60 + frac * (19 * col_w)
        part_y = by + 125
        draw.ellipse([part_x - 4, part_y - 4, part_x + 4, part_y + 4], fill=(0, 240, 255))

    # Bottom SIK Gesture Telemetry
    draw.rounded_rectangle([W//2 - 250, H - 75, W//2 + 250, H - 25], radius=25, fill=(16, 24, 40), outline=(0, 240, 255))
    draw.ellipse([W//2 - 220, H - 57, W//2 - 206, H - 43], fill=(0, 255, 160))
    draw.text((W//2 - 195, H - 57), "LEFT PINCH: ENGAGED", fill=(0, 255, 160))
    draw.ellipse([W//2 + 20, H - 57, W//2 + 34, H - 43], fill=(0, 255, 160))
    draw.text((W//2 + 45, H - 57), "RIGHT PINCH: ENGAGED", fill=(0, 255, 160))

    # Waveguide boundary vignette
    draw.rectangle([15, 15, W - 15, H - 15], outline=(0, 240, 255, 100), width=3)

    # Write raw RGB bytes to ffmpeg stdin
    proc.stdin.write(img.tobytes())

proc.stdin.close()
proc.wait()

if os.path.exists(AUDIO_PATH):
    os.remove(AUDIO_PATH)

print(f"Successfully generated {OUT_VIDEO} (code: {proc.returncode})")
