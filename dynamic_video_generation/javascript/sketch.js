function hexToRgb(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return [r, g, b];
}

// Canvas and circle config
let widthVal = 800;
let heightVal = 800;
let circleRadiusRatio = 0.4;
let centerColorHex = "#00AEC9";
let edgeColorHex = "#0D6586";
let centerColor = hexToRgb(centerColorHex);
let edgeColor = hexToRgb(edgeColorHex);

// Main circle background color
let backgroundColor = [220, 220, 220];

// We'll store the precomputed main circle in a graphics buffer
let mainCircleGraphics;

// Ring (wave) parameters
let waveInterval = 2000; // spawn a new ring every 2s
let waveLifespan = 3000; // each ring lasts 3s
let waveLobes = 3;       // number of symmetrical lobes for the partial circle
// We'll pick random colors for each new ring to keep it interesting
// or you can fix them if you prefer.

// Timing
let lastWaveSpawn = -waveInterval;
let rings = []; // store active rings

let cx, cy, maxRadius;
let mainCircleRadius; // computed from circleRadiusRatio

function setup() {
  createCanvas(widthVal, heightVal);
  pixelDensity(1);

  cx = widthVal / 2;
  cy = heightVal / 2;
  maxRadius = Math.min(widthVal, heightVal) / 2;

  // Compute main circle radius from ratio
  mainCircleRadius = circleRadiusRatio * maxRadius;

  // Precompute the main circle in a separate graphics buffer
  mainCircleGraphics = createGraphics(widthVal, heightVal);
  mainCircleGraphics.pixelDensity(1);
  mainCircleGraphics.loadPixels();
  for (let y = 0; y < heightVal; y++) {
    for (let x = 0; x < widthVal; x++) {
      let dx = x - cx;
      let dy = y - cy;
      let dist = Math.sqrt(dx*dx + dy*dy);
      let distRatio = dist / maxRadius;

      let r, g, b;
      if (distRatio > 1.0) {
        [r, g, b] = backgroundColor;
      } else {
        let t;
        if (distRatio <= circleRadiusRatio) {
          t = 0.0;
        } else {
          t = (distRatio - circleRadiusRatio) / (1.0 - circleRadiusRatio);
        }
        r = Math.round(centerColor[0] + (edgeColor[0] - centerColor[0]) * t);
        g = Math.round(centerColor[1] + (edgeColor[1] - centerColor[1]) * t);
        b = Math.round(centerColor[2] + (edgeColor[2] - centerColor[2]) * t);
      }

      let idx = (y * widthVal + x) * 4;
      mainCircleGraphics.pixels[idx] = r;
      mainCircleGraphics.pixels[idx+1] = g;
      mainCircleGraphics.pixels[idx+2] = b;
      mainCircleGraphics.pixels[idx+3] = 255;
    }
  }
  mainCircleGraphics.updatePixels();
}

function draw() {
  let t = millis();

  // Spawn new ring if needed
  if (t - lastWaveSpawn >= waveInterval) {
    spawnRing(t);
    lastWaveSpawn = t;
  }

  // Remove expired rings (if they passed beyond the canvas)
  rings = rings.filter(ring => {
    let phase = (t - ring.startT) / waveLifespan;
    return phase >= 0.0 && phase <= 1.0;
  });

  loadPixels();
  // First, copy main circle graphics into pixels
  // This gives us the baseline main circle image each frame
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = mainCircleGraphics.pixels[i];
  }

  // Now draw rings on top
  // We'll blend them pixel by pixel
  for (let y = 0; y < heightVal; y++) {
    for (let x = 0; x < widthVal; x++) {
      let idx = (y * widthVal + x) * 4;
      let baseR = pixels[idx];
      let baseG = pixels[idx+1];
      let baseB = pixels[idx+2];

      let dx = x - cx;
      let dy = y - cy;
      let dist = Math.sqrt(dx*dx + dy*dy);
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2*Math.PI; // normalize angle to [0,2π)

      // Blend all active rings
      let r = baseR;
      let g = baseG;
      let b = baseB;

      for (let ring of rings) {
        let col = ringColorAtPixel(ring, dist, angle, t);
        if (col) {
          // Blend with averaging or additive. Let's use averaging:
          r = (r + col[0]) / 2;
          g = (g + col[1]) / 2;
          b = (b + col[2]) / 2;
        }
      }

      pixels[idx] = r;
      pixels[idx+1] = g;
      pixels[idx+2] = b;
      // alpha remains 255
    }
  }

  updatePixels();
}

// Spawns a new ring at currentTime t
function spawnRing(currentTime) {
  // Each ring starts at mainCircleRadius and expands to beyond maxRadius
  // Choose random colors for the ring
  let ringStartColor = [random(0,255), random(0,255), random(0,255)];
  let ringEndColor = [random(0,255), random(0,255), random(0,255)];

  rings.push({
    startT: currentTime,
    startColor: ringStartColor,
    endColor: ringEndColor
  });
}

// Compute ring color at a given pixel
function ringColorAtPixel(ring, dist, angle, currentTime) {
  let phase = (currentTime - ring.startT) / waveLifespan;
  if (phase < 0 || phase > 1) return null;

  // The ring radius grows from mainCircleRadius to well beyond maxRadius
  // Let's say at phase=0 ring radius = mainCircleRadius,
  // at phase=1 ring radius = maybe 2 * maxRadius so it fully passes off screen
  let currentRadius = mainCircleRadius + (2 * maxRadius - mainCircleRadius)*phase;

  if (dist > currentRadius) return null; // outside ring radius

  // Let's make the ring fairly thin: the ring thickness is about 15% of (2*maxRadius)
  // We can define thickness as a fraction of the radius difference
  // Actually, let's say the ring thickness = 0.1 * (currentRadius - mainCircleRadius)
  // so it's always a thin band at the outer edge
  let ringThickness = 0.1 * (2 * maxRadius - mainCircleRadius);
  // We want pixels close to currentRadius but not too far inside.
  // If dist < currentRadius - ringThickness, it's inside the ring "interior" zone:
  if (dist < currentRadius - ringThickness) {
    return null; // inside area too close, ring is just a band near the radius
  }

  // Angular modulation for partial circle:
  // intensity = 0.5 + 0.5*sin(angle * waveLobes)
  let intensity = 0.5 + 0.5 * Math.sin(angle * waveLobes);

  // Dist ratio within ring thickness:
  let distRatio = (dist - (currentRadius - ringThickness)) / ringThickness;
  distRatio = constrain(distRatio, 0, 1);

  // Color interpolation over the ring's lifetime:
  let r = lerp(ring.startColor[0], ring.endColor[0], phase);
  let g = lerp(ring.startColor[1], ring.endColor[1], phase);
  let b = lerp(ring.startColor[2], ring.endColor[2], phase);

  // Also fade intensity at edges of thickness if you want a smooth gradient:
  // Let's fade at both ends to have a nice gradient:
  let thicknessFade = 1.0 - Math.abs(distRatio - 0.5)*2; // peak at center
  // Combine both intensity factors
  let finalIntensity = intensity * thicknessFade;

  r *= finalIntensity;
  g *= finalIntensity;
  b *= finalIntensity;

  return [r, g, b];
}

// Utility lerp function (p5 has lerp but let's be explicit)
function lerp(start, end, t) {
  return start + (end - start)*t;
}
