function hexToRgb(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return [r, g, b];
}

let widthVal = 800;
let heightVal = 800;
let circleRadiusRatio = 0.4;
let centerColorHex = "#00AEC9"; // from config
let edgeColorHex = "#0D6586";   // from config

let centerColor = hexToRgb(centerColorHex);
let edgeColor = hexToRgb(edgeColorHex);

function setup() {
  createCanvas(widthVal, heightVal);
  pixelDensity(1); // For simplicity, don't use high-density displays
  noLoop(); // We'll draw once since it's a static image
}

function draw() {
  // Background: neutral gray
  // We'll draw directly to pixels, so let's set a base background after loadPixels().
  loadPixels();

  const cx = widthVal / 2;
  const cy = heightVal / 2;
  const maxRadius = Math.min(widthVal, heightVal) / 2;
  const background = [220, 220, 220];

  // For each pixel, compute distance and interpolate color
  for (let y = 0; y < heightVal; y++) {
    for (let x = 0; x < widthVal; x++) {
      let dx = x - cx;
      let dy = y - cy;
      let dist = Math.sqrt(dx*dx + dy*dy);
      let distRatio = dist / maxRadius;

      let r, g, b;
      if (distRatio > 1.0) {
        // outside the circle
        [r, g, b] = background;
      } else {
        let t;
        if (distRatio <= circleRadiusRatio) {
          t = 0.0;
        } else {
          t = (distRatio - circleRadiusRatio) / (1.0 - circleRadiusRatio);
        }

        // interpolate colors
        r = Math.round(centerColor[0] + (edgeColor[0] - centerColor[0]) * t);
        g = Math.round(centerColor[1] + (edgeColor[1] - centerColor[1]) * t);
        b = Math.round(centerColor[2] + (edgeColor[2] - centerColor[2]) * t);
      }

      let idx = (y * widthVal + x) * 4;
      pixels[idx] = r;
      pixels[idx+1] = g;
      pixels[idx+2] = b;
      pixels[idx+3] = 255; // fully opaque
    }
  }

  updatePixels();
  // The canvas now shows the static Turrell-like circular gradient.
}
