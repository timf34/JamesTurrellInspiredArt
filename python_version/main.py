import json
from PIL import Image
import math

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# Load configuration
with open("config.json", "r") as f:
    config = json.load(f)

width = config.get("width", 800)
height = config.get("height", 800)
circle_radius_ratio = config.get("circle_radius_ratio", 0.4)
center_color = config.get("center_color", "#00AEC9")
edge_color = config.get("edge_color", "#0D6586")

center_color_rgb = hex_to_rgb(center_color)
edge_color_rgb = hex_to_rgb(edge_color)

# Create a new image with a background (e.g. neutral gray)
img = Image.new("RGB", (width, height), (220, 220, 220))
pixels = img.load()

# Center of the image
cx, cy = width / 2, height / 2

# The radius within which we blend the colors
max_radius = min(width, height) / 2

for y in range(height):
    for x in range(width):
        dx = x - cx
        dy = y - cy
        dist = math.sqrt(dx*dx + dy*dy)

        # If we want a smooth radial gradient:
        # dist_ratio goes from 0 at center to 1 at the edge of the circle
        dist_ratio = dist / max_radius

        # You can tweak how sharp or soft the transition is.
        # Here we assume a simple linear blend.
        # If circle_radius_ratio < 1, you can use that to adjust color transitions:
        # For instance, the "center" color dominates up to circle_radius_ratio * max_radius,
        # and then gradually transitions to the edge color.
        if dist_ratio <= circle_radius_ratio:
            # Within the inner zone, it's mostly the center color
            t = 0.0
        elif dist_ratio >= 1.0:
            # Beyond the max_radius, it's just the background (no circle)
            # To mimic Turrell’s glow, we might let it fade into the gray:
            pixels[x, y] = (220, 220, 220)
            continue
        else:
            # Between the inner circle and edge, blend the colors
            # Normalize so that 0 -> at circle_radius_ratio and 1 -> at edge
            normalized = (dist_ratio - circle_radius_ratio) / (1.0 - circle_radius_ratio)
            t = normalized  # linear interpolation factor

        # Interpolate the color
        # When t=0: center_color
        # When t=1: edge_color
        r = int(center_color_rgb[0] + (edge_color_rgb[0] - center_color_rgb[0]) * t)
        g = int(center_color_rgb[1] + (edge_color_rgb[1] - center_color_rgb[1]) * t)
        b = int(center_color_rgb[2] + (edge_color_rgb[2] - center_color_rgb[2]) * t)

        # If outside the circle radius, let’s fade to background:
        # For simplicity, if dist_ratio > 1 just leave it background
        # Already handled above.

        pixels[x, y] = (r, g, b)

# Save the image
img.save("turrell_circle.png")
print("Image saved as turrell_circle.png")
