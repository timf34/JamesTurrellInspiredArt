import json
from PIL import Image
import math
import time
from datetime import datetime

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

start_time = time.time()

# Load configuration
config_start = time.time()
with open("config.json", "r") as f:
    config = json.load(f)
config_time = time.time() - config_start

width = config.get("width", 800)
height = config.get("height", 800)
circle_radius_ratio = config.get("circle_radius_ratio", 0.4)
center_color = config.get("center_color", "#00AEC9")
edge_color = config.get("edge_color", "#0D6586")

center_color_rgb = hex_to_rgb(center_color)
edge_color_rgb = hex_to_rgb(edge_color)

# Create a new image with a background (e.g. neutral gray)
init_start = time.time()
img = Image.new("RGB", (width, height), (220, 220, 220))
pixels = img.load()
init_time = time.time() - init_start

# Center of the image
cx, cy = width / 2, height / 2

# The radius within which we blend the colors
max_radius = min(width, height) / 2

# Pixel processing
pixel_start = time.time()
for y in range(height):
    for x in range(width):
        dx = x - cx
        dy = y - cy
        dist = math.sqrt(dx*dx + dy*dy)

        dist_ratio = dist / max_radius

        if dist_ratio <= circle_radius_ratio:
            t = 0.0
        elif dist_ratio >= 1.0:
            pixels[x, y] = (220, 220, 220)
            continue
        else:
            normalized = (dist_ratio - circle_radius_ratio) / (1.0 - circle_radius_ratio)
            t = normalized

        r = int(center_color_rgb[0] + (edge_color_rgb[0] - center_color_rgb[0]) * t)
        g = int(center_color_rgb[1] + (edge_color_rgb[1] - center_color_rgb[1]) * t)
        b = int(center_color_rgb[2] + (edge_color_rgb[2] - center_color_rgb[2]) * t)

        pixels[x, y] = (r, g, b)
pixel_time = time.time() - pixel_start

# Save the image
save_start = time.time()
img.save("turrell_circle.png")
save_time = time.time() - save_start

total_time = time.time() - start_time

# Print timing results
print(f"\nPerformance Breakdown ({datetime.now()}):")
print(f"{'='*50}")
print(f"Configuration loading: {config_time:.4f} seconds")
print(f"Image initialization: {init_time:.4f} seconds")
print(f"Pixel processing: {pixel_time:.4f} seconds")
print(f"Image saving: {save_time:.4f} seconds")
print(f"{'='*50}")
print(f"Total execution time: {total_time:.4f} seconds")
print(f"\nImage saved as turrell_circle.png")