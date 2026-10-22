const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Helper to fill rectangle
function fillRect(png, x0, y0, w, h, r, g, b, a = 255) {
  const xStart = Math.max(0, Math.round(x0));
  const yStart = Math.max(0, Math.round(y0));
  const xEnd = Math.min(png.width, Math.round(x0 + w));
  const yEnd = Math.min(png.height, Math.round(y0 + h));

  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }
}

// Helper to draw rounded rectangle with antialiasing
function fillRoundedRect(png, x0, y0, w, h, radius, r, g, b, a = 255) {
  const rad = Math.min(radius, w / 2, h / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inside = true;
      let alphaMultiplier = 1;

      // Check 4 corners
      if (x < rad && y < rad) {
        const dist = Math.hypot(x - rad, y - rad);
        if (dist > rad) inside = false;
        else if (dist > rad - 1) alphaMultiplier = rad - dist;
      } else if (x >= w - rad && y < rad) {
        const dist = Math.hypot(x - (w - rad - 1), y - rad);
        if (dist > rad) inside = false;
        else if (dist > rad - 1) alphaMultiplier = rad - dist;
      } else if (x < rad && y >= h - rad) {
        const dist = Math.hypot(x - rad, y - (h - rad - 1));
        if (dist > rad) inside = false;
        else if (dist > rad - 1) alphaMultiplier = rad - dist;
      } else if (x >= w - rad && y >= h - rad) {
        const dist = Math.hypot(x - (w - rad - 1), y - (h - rad - 1));
        if (dist > rad) inside = false;
        else if (dist > rad - 1) alphaMultiplier = rad - dist;
      }

      if (inside) {
        const px = Math.round(x0 + x);
        const py = Math.round(y0 + y);
        if (px >= 0 && px < png.width && py >= 0 && py < png.height) {
          const idx = (png.width * py + px) << 2;
          const finalA = Math.round(a * alphaMultiplier);
          if (finalA >= 255) {
            png.data[idx] = r;
            png.data[idx + 1] = g;
            png.data[idx + 2] = b;
            png.data[idx + 3] = 255;
          } else if (finalA > 0) {
            // Alpha blend
            const bgA = png.data[idx + 3] / 255;
            const fgA = finalA / 255;
            const outA = fgA + bgA * (1 - fgA);
            png.data[idx] = Math.round((r * fgA + png.data[idx] * bgA * (1 - fgA)) / outA);
            png.data[idx + 1] = Math.round((g * fgA + png.data[idx + 1] * bgA * (1 - fgA)) / outA);
            png.data[idx + 2] = Math.round((b * fgA + png.data[idx + 2] * bgA * (1 - fgA)) / outA);
            png.data[idx + 3] = Math.round(outA * 255);
          }
        }
      }
    }
  }
}

// Draws a standard QR finder pattern (7x7 module target: 7x7 outer, 5x5 white, 3x3 inner)
function drawFinderPattern(png, x, y, moduleSize, darkColor, lightColor) {
  const [dr, dg, db] = darkColor;
  const [lr, lg, lb] = lightColor;
  const rad = moduleSize * 0.8;

  // Outer 7x7
  fillRoundedRect(png, x, y, moduleSize * 7, moduleSize * 7, rad, dr, dg, db);
  // Inner 5x5 light
  fillRoundedRect(png, x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5, rad * 0.7, lr, lg, lb);
  // Center 3x3 dark
  fillRoundedRect(png, x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3, rad * 0.5, dr, dg, db);
}

// Generate an icon
function generateIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });

  const primaryBlue = [37, 99, 235]; // #2563eb
  const darkBlue = [30, 58, 138];    // #1e3a8a
  const slateDark = [15, 23, 42];    // #0f172a
  const pureWhite = [255, 255, 255];
  const accentCyan = [56, 189, 248]; // #38bdf8

  if (isMaskable) {
    // Maskable icon: full-bleed background
    fillRect(png, 0, 0, size, size, primaryBlue[0], primaryBlue[1], primaryBlue[2], 255);

    // Keep all icon elements within safe zone (center 80%, margin 10%)
    const safePadding = size * 0.16;
    const contentSize = size - safePadding * 2;
    const cornerRadius = contentSize * 0.18;

    // Inner white card
    fillRoundedRect(png, safePadding, safePadding, contentSize, contentSize, cornerRadius, pureWhite[0], pureWhite[1], pureWhite[2], 255);

    // QR pattern inside card
    const qrPadding = contentSize * 0.14;
    const qrX = safePadding + qrPadding;
    const qrY = safePadding + qrPadding;
    const qrW = contentSize - qrPadding * 2;
    const mod = qrW / 17; // 17 module grid

    // Top-Left Finder
    drawFinderPattern(png, qrX, qrY, mod, slateDark, pureWhite);
    // Top-Right Finder
    drawFinderPattern(png, qrX + mod * 10, qrY, mod, slateDark, pureWhite);
    // Bottom-Left Finder
    drawFinderPattern(png, qrX, qrY + mod * 10, mod, slateDark, pureWhite);

    // Data dots
    fillRect(png, qrX + mod * 8, qrY + mod * 2, mod * 1.2, mod * 1.2, primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    fillRect(png, qrX + mod * 8, qrY + mod * 5, mod * 1.2, mod * 1.2, slateDark[0], slateDark[1], slateDark[2]);
    fillRect(png, qrX + mod * 11, qrY + mod * 8, mod * 1.2, mod * 1.2, slateDark[0], slateDark[1], slateDark[2]);
    fillRect(png, qrX + mod * 13, qrY + mod * 11, mod * 1.4, mod * 1.4, primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    fillRect(png, qrX + mod * 10, qrY + mod * 13, mod * 1.4, mod * 1.4, primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    fillRect(png, qrX + mod * 13, qrY + mod * 13, mod * 1.6, mod * 1.6, slateDark[0], slateDark[1], slateDark[2]);

    // Horizontal scanner laser line across middle
    const laserY = qrY + mod * 8.5;
    fillRect(png, safePadding + contentSize * 0.08, laserY - mod * 0.35, contentSize * 0.84, mod * 0.7, accentCyan[0], accentCyan[1], accentCyan[2], 255);
  } else {
    // Standard icon (any purpose): rounded icon with subtle transparent border
    const pad = size * 0.04;
    const boxSize = size - pad * 2;
    const cornerRadius = boxSize * 0.22;

    // Primary blue rounded container
    fillRoundedRect(png, pad, pad, boxSize, boxSize, cornerRadius, primaryBlue[0], primaryBlue[1], primaryBlue[2], 255);

    // Inner white page/card
    const innerPad = boxSize * 0.12;
    const innerX = pad + innerPad;
    const innerY = pad + innerPad;
    const innerW = boxSize - innerPad * 2;
    const innerH = boxSize - innerPad * 2;
    fillRoundedRect(png, innerX, innerY, innerW, innerH, cornerRadius * 0.65, pureWhite[0], pureWhite[1], pureWhite[2], 255);

    // QR grid
    const qrMargin = innerW * 0.12;
    const qrX = innerX + qrMargin;
    const qrY = innerY + qrMargin;
    const qrW = innerW - qrMargin * 2;
    const mod = qrW / 17;

    // 3 Finders
    drawFinderPattern(png, qrX, qrY, mod, slateDark, pureWhite);
    drawFinderPattern(png, qrX + mod * 10, qrY, mod, slateDark, pureWhite);
    drawFinderPattern(png, qrX, qrY + mod * 10, mod, slateDark, pureWhite);

    // Data pixels
    fillRect(png, qrX + mod * 8, qrY + mod * 2, mod * 1.2, mod * 1.2, primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    fillRect(png, qrX + mod * 8, qrY + mod * 5, mod * 1.2, mod * 1.2, slateDark[0], slateDark[1], slateDark[2]);
    fillRect(png, qrX + mod * 11, qrY + mod * 8, mod * 1.2, mod * 1.2, slateDark[0], slateDark[1], slateDark[2]);
    fillRect(png, qrX + mod * 13, qrY + mod * 11, mod * 1.4, mod * 1.4, primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    fillRect(png, qrX + mod * 10, qrY + mod * 13, mod * 1.4, mod * 1.4, primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    fillRect(png, qrX + mod * 13, qrY + mod * 13, mod * 1.6, mod * 1.6, slateDark[0], slateDark[1], slateDark[2]);

    // Active scan laser beam
    const laserY = qrY + mod * 8.5;
    fillRect(png, innerX + innerW * 0.06, laserY - mod * 0.35, innerW * 0.88, mod * 0.7, accentCyan[0], accentCyan[1], accentCyan[2], 255);
  }

  return png;
}

function savePng(png, filepath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(filepath);
    png.pack().pipe(out);
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

async function main() {
  console.log('Generating PWA icons:');

  // 1. icon-192.png (192x192, any)
  const icon192 = generateIcon(192, false);
  const path192 = path.join(iconsDir, 'icon-192.png');
  await savePng(icon192, path192);
  console.log('✓ Created', path192);

  // 2. icon-512.png (512x512, any)
  const icon512 = generateIcon(512, false);
  const path512 = path.join(iconsDir, 'icon-512.png');
  await savePng(icon512, path512);
  console.log('✓ Created', path512);

  // 3. icon-maskable-512.png (512x512, maskable)
  const iconMaskable = generateIcon(512, true);
  const pathMaskable = path.join(iconsDir, 'icon-maskable-512.png');
  await savePng(iconMaskable, pathMaskable);
  console.log('✓ Created', pathMaskable);
}

main().catch(console.error);
