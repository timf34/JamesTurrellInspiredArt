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
let circleRadiusRatio = 0.2;  // Now 0.5 to get about half the screen width for the circle
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

let lastWaveSpawn = -waveInterval;
let rings = []; // store active rings

let cx, cy, maxRadius;
let mainCircleRadius;

function setup() {
  createCanvas(widthVal, heightVal);
  pixelDensity(1);

  cx = widthVal / 2;
  cy = heightVal / 2;
  maxRadius = Math.min(widthVal, heightVal) / 2;

  // mainCircleRadius derived from ratio
  mainCircleRadius = circleRadiusRatio * maxRadius;

  // Precompute main circle
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

  // Remove expired rings
  rings = rings.filter(ring => {
    let phase = (t - ring.startT) / waveLifespan;
    return (phase >= 0.0 && phase <= 1.0);
  });

  loadPixels();
  // Copy main circle image
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = mainCircleGraphics.pixels[i];
  }

  // Draw rings
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
      if (angle < 0) angle += 2*Math.PI;

      let r = baseR;
      let g = baseG;
      let b = baseB;

      for (let ring of rings) {
        let col = ringColorAtPixel(ring, dist, angle, t);
        if (col) {
          // Blend with averaging
          r = (r + col[0]) / 2;
          g = (g + col[1]) / 2;
          b = (b + col[2]) / 2;
        }
      }

      pixels[idx] = r;
      pixels[idx+1] = g;
      pixels[idx+2] = b;
      // alpha stays 255
    }
  }

  updatePixels();
}

function spawnRing(currentTime) {
  let ringStartColor = [random(0,255), random(0,255), random(0,255)];
  let ringEndColor = [random(0,255), random(0,255), random(0,255)];

  rings.push({
    startT: currentTime,
    startColor: ringStartColor,
    endColor: ringEndColor
  });
}

function ringColorAtPixel(ring, dist, angle, currentTime) {
  let phase = (currentTime - ring.startT) / waveLifespan;
  if (phase < 0 || phase > 1) return null;

  let currentRadius = mainCircleRadius + (2 * maxRadius - mainCircleRadius)*phase;

  if (dist > currentRadius) return null; // outside ring radius

  let ringThickness = 0.1 * (2 * maxRadius - mainCircleRadius);
  if (dist < currentRadius - ringThickness) {
    return null;
  }

  let intensity = 0.5 + 0.5 * Math.sin(angle * waveLobes);

  let distRatio = (dist - (currentRadius - ringThickness)) / ringThickness;
  distRatio = constrain(distRatio, 0, 1);

  let r = lerp(ring.startColor[0], ring.endColor[0], phase);
  let g = lerp(ring.startColor[1], ring.endColor[1], phase);
  let b = lerp(ring.startColor[2], ring.endColor[2], phase);

  let thicknessFade = 1.0 - Math.abs(distRatio - 0.5)*2;
  let finalIntensity = intensity * thicknessFade;

  r *= finalIntensity;
  g *= finalIntensity;
  b *= finalIntensity;

  return [r, g, b];
}

function lerp(start, end, t) {
  return start + (end - start)*t;
}
