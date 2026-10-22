const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
const samplesDir = path.join(publicDir, 'sample-pages');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
if (!fs.existsSync(samplesDir)) fs.mkdirSync(samplesDir, { recursive: true });

async function run() {
  console.log('Generating PWA Icons...');
  await QRCode.toFile(path.join(iconsDir, 'icon-192.png'), 'https://github.com/gate-multi-qr-scanner', {
    width: 192,
    margin: 2,
    color: { dark: '#2563eb', light: '#ffffff' },
  });

  await QRCode.toFile(path.join(iconsDir, 'icon-512.png'), 'https://github.com/gate-multi-qr-scanner', {
    width: 512,
    margin: 3,
    color: { dark: '#2563eb', light: '#ffffff' },
  });

  console.log('Generating individual QR code SVGs for sample page...');
  const qr1DataUrl = await QRCode.toDataURL('https://gate-prep.org/solutions/ec-2024-q1', { width: 180, margin: 4 });
  const qr2DataUrl = await QRCode.toDataURL('https://gate-prep.org/solutions/ec-2024-q2', { width: 180, margin: 4 });
  const qr3DataUrl = await QRCode.toDataURL('https://gate-prep.org/solutions/ec-2024-q3', { width: 180, margin: 4 });
  const qr4DataUrl = await QRCode.toDataURL('https://gate-prep.org/solutions/ec-2024-q4', { width: 180, margin: 4 });

  // Generate a simulated GATE Book Page SVG with 4 questions and 4 QR codes
  const samplePageSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1300" width="1000" height="1300">
  <!-- Page background -->
  <rect width="1000" height="1300" fill="#ffffff" />
  
  <!-- Header -->
  <rect x="50" y="40" width="900" height="60" fill="#f8fafc" stroke="#cbd5e1" rx="8" />
  <text x="75" y="76" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#1e293b">GATE 2024 • Electronics &amp; Communication Engineering (EC)</text>
  <text x="75" y="93" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Chapter 4: Signals &amp; Systems • Page 42 • Video Solutions &amp; Analysis</text>
  <line x1="50" y1="120" x2="950" y2="120" stroke="#94a3b8" stroke-width="1.5" />

  <!-- Question 1 Block (Top Left) -->
  <g transform="translate(60, 150)">
    <rect width="410" height="500" fill="#fcfcfc" stroke="#e2e8f0" rx="8" />
    <text x="20" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">Q.1</text>
    <text x="20" y="65" font-family="Arial, sans-serif" font-size="14" fill="#334155">Consider a continuous-time LTI system with</text>
    <text x="20" y="88" font-family="Arial, sans-serif" font-size="14" fill="#334155">impulse response h(t) = e^(-2t)u(t). For input</text>
    <text x="20" y="111" font-family="Arial, sans-serif" font-size="14" fill="#334155">x(t) = u(t), the output y(t) as t -&gt; inf is:</text>
    <text x="20" y="145" font-family="Arial, sans-serif" font-size="13" fill="#475569">(A) 0.5   (B) 1.0   (C) 2.0   (D) 0</text>
    <text x="20" y="270" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">Scan for Video Solution &gt;&gt;</text>
    <image href="${qr1DataUrl}" x="110" y="290" width="180" height="180" />
  </g>

  <!-- Question 2 Block (Top Right) -->
  <g transform="translate(530, 150)">
    <rect width="410" height="500" fill="#fcfcfc" stroke="#e2e8f0" rx="8" />
    <text x="20" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">Q.2</text>
    <text x="20" y="65" font-family="Arial, sans-serif" font-size="14" fill="#334155">The Nyquist sampling frequency for a bandpass</text>
    <text x="20" y="88" font-family="Arial, sans-serif" font-size="14" fill="#334155">signal x(t) occupying spectrum from 40 kHz</text>
    <text x="20" y="111" font-family="Arial, sans-serif" font-size="14" fill="#334155">to 46 kHz is at minimum:</text>
    <text x="20" y="145" font-family="Arial, sans-serif" font-size="13" fill="#475569">(A) 12 kHz   (B) 92 kHz   (C) 6 kHz   (D) 23 kHz</text>
    <text x="20" y="270" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">Scan for Video Solution &gt;&gt;</text>
    <image href="${qr2DataUrl}" x="110" y="290" width="180" height="180" />
  </g>

  <!-- Question 3 Block (Bottom Left) -->
  <g transform="translate(60, 690)">
    <rect width="410" height="520" fill="#fcfcfc" stroke="#e2e8f0" rx="8" />
    <text x="20" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">Q.3</text>
    <text x="20" y="65" font-family="Arial, sans-serif" font-size="14" fill="#334155">The Z-transform of sequence x[n] = (0.5)^n u[n]</text>
    <text x="20" y="88" font-family="Arial, sans-serif" font-size="14" fill="#334155">has Region of Convergence (ROC) defined by:</text>
    <text x="20" y="125" font-family="Arial, sans-serif" font-size="13" fill="#475569">(A) |z| &gt; 0.5   (B) |z| &lt; 0.5   (C) All z</text>
    <text x="20" y="280" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">Scan for Video Solution &gt;&gt;</text>
    <image href="${qr3DataUrl}" x="110" y="300" width="180" height="180" />
  </g>

  <!-- Question 4 Block (Bottom Right) -->
  <g transform="translate(530, 690)">
    <rect width="410" height="520" fill="#fcfcfc" stroke="#e2e8f0" rx="8" />
    <text x="20" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">Q.4</text>
    <text x="20" y="65" font-family="Arial, sans-serif" font-size="14" fill="#334155">An analog signal is passed through an ideal lowpass</text>
    <text x="20" y="88" font-family="Arial, sans-serif" font-size="14" fill="#334155">filter with cutoff frequency 5 kHz. Find the energy</text>
    <text x="20" y="111" font-family="Arial, sans-serif" font-size="14" fill="#334155">spectral density of the output waveform:</text>
    <text x="20" y="145" font-family="Arial, sans-serif" font-size="13" fill="#475569">(A) 25 J/Hz   (B) 10 J/Hz   (C) 50 J/Hz   (D) 0</text>
    <text x="20" y="280" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#2563eb">Scan for Video Solution &gt;&gt;</text>
    <image href="${qr4DataUrl}" x="110" y="300" width="180" height="180" />
  </g>
</svg>`;

  fs.writeFileSync(path.join(samplesDir, 'gate_sample_page_4qr.svg'), samplePageSvg);
  console.log('Sample GATE book page SVG written to public/sample-pages/gate_sample_page_4qr.svg');
}

run().catch(console.error);
