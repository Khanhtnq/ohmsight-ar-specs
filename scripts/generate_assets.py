import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1280, 800
img = Image.new('RGBA', (W, H), (8, 12, 22, 255))
draw = ImageDraw.Draw(img)

# Background glowing grid
for x in range(0, W, 40):
    alpha = 25 if x % 200 != 0 else 55
    draw.line([(x, 0), (x, H)], fill=(0, 240, 255, alpha), width=1)
for y in range(0, H, 40):
    alpha = 25 if y % 200 != 0 else 55
    draw.line([(0, y), (W, y)], fill=(0, 240, 255, alpha), width=1)

# Subtle radial glow from center
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
gdraw.ellipse([W//2 - 400, H//2 - 250, W//2 + 400, H//2 + 250], fill=(0, 180, 255, 35))
glow = glow.filter(ImageFilter.GaussianBlur(80))
img = Image.alpha_composite(img, glow)
draw = ImageDraw.Draw(img)

# Breadboard graphic
bx, by, bw, bh = 240, 320, 800, 340
# Breadboard base
draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=20, fill=(20, 28, 45, 255), outline=(0, 240, 255, 120), width=2)

# Power rails
draw.line([(bx + 30, by + 30), (bx + bw - 30, by + 30)], fill=(255, 50, 70, 220), width=3) # + rail red
draw.line([(bx + 30, by + 50), (bx + bw - 30, by + 50)], fill=(0, 150, 255, 220), width=3) # - rail blue
draw.line([(bx + 30, by + bh - 50), (bx + bw - 30, by + bh - 50)], fill=(255, 50, 70, 220), width=3)
draw.line([(bx + 30, by + bh - 30), (bx + bw - 30, by + bh - 30)], fill=(0, 150, 255, 220), width=3)

# Center trough
draw.rectangle([bx + 20, by + bh//2 - 12, bx + bw - 20, by + bh//2 + 12], fill=(12, 16, 26, 255))

# Tie point pin grid
cols = 30
col_w = (bw - 80) / cols
for c in range(cols):
    cx_pin = bx + 40 + c * col_w
    # Top 5 rows
    for r in range(5):
        cy_pin = by + 75 + r * 14
        draw.ellipse([cx_pin - 2.5, cy_pin - 2.5, cx_pin + 2.5, cy_pin + 2.5], fill=(10, 14, 22, 255), outline=(0, 240, 255, 60))
    # Bot 5 rows
    for r in range(5):
        cy_pin = by + bh//2 + 25 + r * 14
        draw.ellipse([cx_pin - 2.5, cy_pin - 2.5, cx_pin + 2.5, cy_pin + 2.5], fill=(10, 14, 22, 255), outline=(0, 240, 255, 60))

# Jumper Wires
draw.arc([bx + 40, by + 10, bx + 160, by + 90], 180, 360, fill=(255, 50, 80, 255), width=4)
draw.arc([bx + 140, by + 60, bx + 360, by + 160], 180, 360, fill=(255, 200, 0, 255), width=4)
draw.arc([bx + 360, by + 60, bx + 580, by + 160], 180, 360, fill=(0, 255, 160, 255), width=4)

# Resistor R1
rx1, ry1, rx2, ry2 = bx + 220, by + 105, bx + 340, by + 105
draw.line([(rx1, ry1), (rx2, ry2)], fill=(200, 160, 120, 255), width=4)
draw.rounded_rectangle([rx1 + 30, ry1 - 10, rx2 - 30, ry2 + 10], radius=5, fill=(40, 48, 65, 255), outline=(255, 220, 0, 255), width=2)
# Resistor bands (Brown, Black, Orange, Gold)
draw.line([(rx1 + 45, ry1 - 9), (rx1 + 45, ry1 + 9)], fill=(139, 69, 19, 255), width=3)
draw.line([(rx1 + 55, ry1 - 9), (rx1 + 55, ry1 + 9)], fill=(0, 0, 0, 255), width=3)
draw.line([(rx1 + 65, ry1 - 9), (rx1 + 65, ry1 + 9)], fill=(255, 165, 0, 255), width=3)
draw.line([(rx1 + 75, ry1 - 9), (rx1 + 75, ry1 + 9)], fill=(218, 165, 32, 255), width=3)

# Illuminated LED
led_x, led_y = bx + 580, by + 105
led_glow = Image.new('RGBA', (W, H), (0,0,0,0))
lgdraw = ImageDraw.Draw(led_glow)
lgdraw.ellipse([led_x - 35, led_y - 35, led_x + 35, led_y + 35], fill=(255, 20, 80, 120))
led_glow = led_glow.filter(ImageFilter.GaussianBlur(15))
img = Image.alpha_composite(img, led_glow)
draw = ImageDraw.Draw(img)
draw.ellipse([led_x - 14, led_y - 14, led_x + 14, led_y + 14], fill=(255, 40, 90, 255), outline=(255, 255, 255, 220), width=2)

# Floating Holographic AR HUD Card
hx, hy, hw, hh = 440, 80, 400, 210
draw.rounded_rectangle([hx, hy, hx + hw, hy + hh], radius=16, fill=(12, 20, 36, 240), outline=(0, 240, 255, 200), width=2)
draw.text((hx + 20, hy + 18), 'SPATIAL MULTIMETER PROBES [AV]', fill=(0, 240, 255, 255))
draw.text((hx + 20, hy + 42), '2.500 V', fill=(255, 255, 255, 255))
draw.text((hx + 20, hy + 110), 'V(+) = 2.500 V   |   V(-) = 0.000 V (GND)', fill=(0, 255, 160, 255))
draw.text((hx + 20, hy + 135), 'I(Branch) = 0.250 mA   |   P = 0.625 mW', fill=(255, 220, 0, 255))
draw.text((hx + 20, hy + 165), 'MNA Solver: KCL/KVL 100% Converged (0.24ms)', fill=(180, 210, 255, 220))

# Multimeter Probes Snap Lines
# Red Probe (+) on Row 10
px_red, py_red = bx + 280, by + 105
draw.line([(px_red, py_red), (px_red + 40, py_red - 60)], fill=(255, 40, 70, 255), width=4)
draw.ellipse([px_red - 8, py_red - 8, px_red + 8, py_red + 8], fill=(255, 40, 70, 255), outline=(255, 255, 255, 255), width=2)
draw.rounded_rectangle([px_red + 15, py_red - 85, px_red + 105, py_red - 65], radius=6, fill=(255, 40, 70, 255))
draw.text((px_red + 22, py_red - 82), 'RED [A10]', fill=(255, 255, 255, 255))

# Black Probe (-) on Ground Rail
px_blk, py_blk = bx + 160, by + 50
draw.line([(px_blk, py_blk), (px_blk - 40, py_blk - 60)], fill=(60, 70, 90, 255), width=4)
draw.ellipse([px_blk - 8, py_blk - 8, px_blk + 8, py_blk + 8], fill=(30, 40, 60, 255), outline=(0, 240, 255, 200), width=2)
draw.rounded_rectangle([px_blk - 105, py_blk - 85, px_blk - 15, py_blk - 65], radius=6, fill=(30, 40, 60, 255), outline=(0, 240, 255, 200))
draw.text((px_blk - 98, py_blk - 82), 'BLK [GND]', fill=(0, 240, 255, 255))

# Header branding
draw.rounded_rectangle([40, 30, 340, 85], radius=12, fill=(15, 24, 42, 230), outline=(0, 240, 255, 160), width=1)
draw.text((58, 42), 'OhmSight AR', fill=(0, 240, 255, 255))
draw.text((60, 72), 'Snap Spectacles SIK Circuit Tutor', fill=(255, 220, 0, 230))

# Badges on top right
draw.rounded_rectangle([W - 360, 30, W - 40, 85], radius=12, fill=(15, 24, 42, 230), outline=(255, 220, 0, 160), width=1)
draw.text((W - 340, 42), 'Devpost: Learn AR with SPECS', fill=(255, 220, 0, 255))
draw.text((W - 340, 65), '$2,500 Cash Track | Snap OS / SIK', fill=(180, 210, 255, 220))

# Waveguide FOV boundary border
draw.rectangle([10, 10, W - 10, H - 10], outline=(0, 240, 255, 80), width=2)

os.makedirs('assets', exist_ok=True)
img.save('assets/thumbnail_1280x800.png', 'PNG')
print('Successfully saved assets/thumbnail_1280x800.png')
