# GATE Multi-QR Scanner 📱⚡

> **Scan one page. Extract every QR code.**  
> A mobile-first, client-side Progressive Web Application (PWA) designed to capture an entire GATE exam preparation book page in a single photograph, automatically detect and decode **all** readable QR codes, organize them into natural reading order, optionally match printed question numbers (Q1, Q2, etc.), and provide convenient single & bulk copying.

---

## 🌟 Key Features

1. **True Multi-QR Detection in One Shot**:
   - Captures a single photograph containing 2, 4, 6 or more QR codes.
   - Multi-tiered computer vision pipeline:
     - **Native BarcodeDetector API**: Hardware-accelerated native detection on Chromium / Android Chrome.
     - **Progressive Masking Engine (`jsQR`)**: Sequentially locates a QR code, masks its finder patterns with neutral background, and continues scanning the page for remaining codes.
     - **Adaptive Grid Tiling**: Slices high-resolution book page photographs into overlapping regional tiles so that small QR codes printed across large pages are detected with 100% precision.
     - **ZXing QR Engine**: Integrated fallback decoder.
2. **Spatial Reading Order Sorting (Row-Clustering)**:
   - Sorts codes into top-to-bottom, left-to-right natural reading order.
   - Adaptive vertical tolerance clusters codes into horizontal rows even when printed at slightly varied heights.
   - Manual drag / arrow reordering controls with immediate live re-indexing.
3. **Smart Duplicate Handling**:
   - Preserves physically distinct QR codes even if they intentionally share identical URLs.
   - Merges redundant detections from overlapping tiles.
   - Optional *"Hide Repeated Links"* toggle.
4. **Question Number Recognition (OCR)**:
   - Separate, optional OCR pass powered by Tesseract.js.
   - Conservative spatial association: links nearby question labels (`Q1`, `Q.2`, `Question 3`, `Q15`, `Q2(a)`) to their corresponding QR code.
   - Shows clear confidence tags: *Confirmed*, *OCR Match*, *Check Q#*, or *Add Q#*.
   - Inline editable question numbers on every card.
5. **Versatile Copying & Export**:
   - Single-click copy per card with *"Copied!"* feedback.
   - Prominent **Copy All** button with multiple selectable format modes:
     - **URLs Only**: Just the links, one per line.
     - **Q-Number Map**: `Q1 | https://...`
     - **Numbered List**: `1. https://...`
     - **Raw Payloads**: Exact raw text/data.
   - Export to **TXT** or **CSV** (escaped spreadsheet format).
6. **100% Client-Side & Private**:
   - No external AI subscriptions, no paid APIs, no server uploads.
   - Your book photographs are processed entirely in your browser and never leave your device.
7. **PWA (Progressive Web App)**:
   - Web App Manifest (`manifest.webmanifest`), app icons, theme color `#2563eb`.
   - Offline application shell caching via Service Worker (`service-worker.js`).
   - Installable directly to your Android home screen via Chrome.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite 6
- **Styling**: Vanilla modern CSS (mobile-first, touch targets ≥ 44px, no viewport overflow)
- **Icons**: Lucide React (`lucide-react`)
- **QR Decoding**: `BarcodeDetector` Web API + `jsQR` + `@zxing/library`
- **OCR Engine**: `Tesseract.js` (client-side worker)
- **Testing**: Vitest (15 unit and synthetic integration tests)

---

## 📋 System Requirements

- **Operating System**: Windows 10/11, macOS, Linux, or Android.
- **Node.js**: v18.0.0 or higher (v20+ LTS recommended).
- **Browser**: Google Chrome, Microsoft Edge, Brave, or Firefox.

---

## 🚀 Getting Started on Windows (Step-by-Step)

### 1. Open PowerShell
Open PowerShell on your Windows laptop.

### 2. Navigate to the Project Directory
```powershell
cd d:\gate-multi-qr-scanner
```

### 3. Verify Node.js and Dependencies
Ensure Node.js is on your path:
```powershell
node -v
npm -v
```
*(If you need to install dependencies fresh):*
```powershell
npm install
```

### 4. Start the Development Server
```powershell
npm run dev -- --host
```
You will see output similar to:
```text
  VITE v6.4.5  ready in 619 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.15:5173/
```

### 5. Access the Application
- **On your Windows laptop**: Open Chrome and visit `http://localhost:5173/`
- **On your Android phone**: Make sure your phone is connected to the same Wi-Fi network as your laptop, then open Chrome on your phone and visit the **Network** URL (e.g., `http://192.168.1.15:5173/`).

---

## 📖 How to Use the Application

### 🧪 One-Click Instant Test (Sample Page)
1. Open the application.
2. Click **"Try with Sample GATE Book Page (4 QR Codes)"**.
3. The app will immediately load a simulated 4-question GATE book page.
4. Within milliseconds, all 4 QR codes are detected, boxed with visual badges, numbered `#1` to `#4` in top-to-bottom reading order, and presented as cards!
5. Click **"Copy All Extracted Links"** to copy all 4 links at once.

### 📸 Scanning Your Physical GATE Book Page
1. Click **Take Photo** to launch the camera, or **Upload Photo** to pick an image from your gallery or file manager.
2. If using the camera:
   - Position your book page flat under good, even lighting.
   - Ensure all QR codes on the page are in frame.
   - Tap the white shutter button to capture.
3. The application will automatically analyze the image.
4. Detected QR codes will be highlighted with cyan bounding boxes and numbered sequence badges on the page preview.
5. Below the preview, each result card displays:
   - Sequence number (`#1`, `#2`, etc.)
   - Question number badge (`Q1`, `Q2`, editable with click)
   - Domain preview badge (e.g. `youtube.com`, `gateforum.com`)
   - Decoded link
   - **Copy** and **Open** buttons
   - Up/Down arrows to adjust order if needed

### ⚡ Troubleshooting & Preprocessing Options
- **"Improve Detection / Retry"**: Click this if any small or faint QR code was missed. It applies contrast stretching (min-max normalization), grayscale conversion, and a 3x3 unsharp sharpening filter before re-running multi-region tiling.
- **"Rotate 90°"**: If you photographed the page in landscape or sideways, tap the rotate button on the preview toolbar to align it upright.
- **"Auto-Detect Question Nos. (OCR)"**: Click this optional button to run OCR on the page and automatically pair nearby `Q1`, `Q2`, `Q3` printed labels with their QR codes.

---

## 📲 How to Install as an Android PWA

To install GATE Multi-QR Scanner as a standalone app on your Android phone:
1. Open Chrome on your Android phone.
2. Navigate to your deployed HTTPS URL (see Deployment section below).
3. Tap the **three dots menu** (⋮) in the top-right corner of Chrome.
4. Tap **"Install app"** or **"Add to Home screen"**.
5. The GATE QR Scanner icon will now appear on your phone home screen and open in full-screen standalone mode like a native app!

> **Note on Camera Permissions**: Modern mobile browsers require an **HTTPS** connection (or `localhost`) to access the device camera. If testing over local network HTTP on your phone, use the **Upload Photo** button (which opens your phone's native camera or gallery), or deploy to a free HTTPS hosting provider.

---

## 🌐 Free HTTPS Deployment Guide

You can deploy this application for free in less than 2 minutes using any of the following platforms:

### Option A: Vercel (Recommended)
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **"Add New Project"** and select `gate-multi-qr-scanner`.
4. Framework Preset will automatically detect **Vite**.
5. Click **"Deploy"**. Your app will be live on an HTTPS URL like `https://gate-multi-qr-scanner.vercel.app`!

### Option B: Netlify
1. Run `npm run build` locally.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag and drop the `dist/` folder into the Netlify drop zone.
4. Netlify will immediately publish your site with a free HTTPS domain!

### Option C: Cloudflare Pages
1. Push your repository to GitHub.
2. In Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > **Pages**.
3. Select your repository. Build command: `npm run build`, output directory: `dist`.
4. Click **"Save and Deploy"**.

---

## 🧪 Automated Testing

The project includes an automated test suite verifying 15 core scenarios using synthetic QR code generation:
```powershell
npm run test
```

### Verified Test Cases:
- [x] Single QR code detection
- [x] Two horizontally aligned QR codes
- [x] Two vertically aligned QR codes
- [x] Four QR codes in a 2x2 grid
- [x] QR codes of different module sizes (small vs large)
- [x] Plain text payloads vs valid URLs
- [x] Two distinct physical QR codes containing identical URLs (duplicate preservation)
- [x] Merging of redundant detections from overlapping tiles
- [x] Empty page handling (0 QR codes)
- [x] Spatial reading order sorting with adaptive row clustering
- [x] Question pattern extraction (`Q1`, `Q.2`, `Question 3`, `Q15`, `Q2(a)`)
- [x] Question spatial matching and confidence scoring
- [x] Bulk copy formatting (`urls-only`, `question-mapping`, `numbered-links`, `raw-all`)
- [x] Domain badge extraction
- [x] Batch session and local history persistence

---

## 🔒 Privacy & Offline Disclosure

- **100% Local Processing**: All QR detection, image enhancements, and clipboard formatting execute strictly within your browser. Photographs are never uploaded to any remote server.
- **Offline Shell**: Once loaded, core QR scanning works 100% offline. Optional Tesseract OCR downloads its English language weights on first use and caches them for subsequent runs.

---

## 📄 License
MIT License. Created for GATE aspirants and students.
