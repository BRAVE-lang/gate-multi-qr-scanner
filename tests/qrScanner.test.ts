import { describe, it, expect, vi } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { sortQRCodesSpatial } from '../src/utils/sorting';
import { deduplicateAndMergeCodes } from '../src/utils/deduplication';
import { validateUrl, getDomainFromUrl } from '../src/utils/urlValidation';
import { matchQuestionsToQRCodes, extractQuestionLabel } from '../src/services/questionMatcher';
import { formatCopyOutput } from '../src/services/clipboard';
import { ExportService } from '../src/services/exportService';
import { HistoryService } from '../src/services/historyService';
import { DecodedQRCode, DetectedTextRegion, PageSession } from '../src/types';

/**
 * Helper to render synthetic decodable QR codes onto a raw pixel buffer
 */
function createSyntheticPage(pageWidth: number, pageHeight: number) {
  const buffer = new Uint8ClampedArray(pageWidth * pageHeight * 4);
  buffer.fill(255); // White background

  return {
    buffer,
    width: pageWidth,
    height: pageHeight,
    drawQR(text: string, destX: number, destY: number, moduleSize = 5) {
      const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
      const size = qr.modules.size;
      const margin = 4; // ISO standard quiet zone
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const isDark = qr.modules.get(r, c);
          const color = isDark ? 0 : 255;
          for (let dy = 0; dy < moduleSize; dy++) {
            for (let dx = 0; dx < moduleSize; dx++) {
              const x = destX + (c + margin) * moduleSize + dx;
              const y = destY + (r + margin) * moduleSize + dy;
              if (x < pageWidth && y < pageHeight) {
                const idx = (y * pageWidth + x) * 4;
                buffer[idx] = color;
                buffer[idx + 1] = color;
                buffer[idx + 2] = color;
                buffer[idx + 3] = 255;
              }
            }
          }
        }
      }
    },
    scanTiles(gridX = 2, gridY = 2, overlap = 0.25): Array<{ data: string; x: number; y: number; w: number; h: number }> {
      const tileW = Math.ceil(pageWidth / gridX);
      const tileH = Math.ceil(pageHeight / gridY);
      const stepX = Math.round(tileW * (1 - overlap));
      const stepY = Math.round(tileH * (1 - overlap));
      const results: Array<{ data: string; x: number; y: number; w: number; h: number }> = [];

      for (let y = 0; y < pageHeight; y += stepY) {
        const curH = Math.min(tileH, pageHeight - y);
        if (curH < 120) continue;
        for (let x = 0; x < pageWidth; x += stepX) {
          const curW = Math.min(tileW, pageWidth - x);
          if (curW < 120) continue;

          const tileBuf = new Uint8ClampedArray(curW * curH * 4);
          for (let ty = 0; ty < curH; ty++) {
            for (let tx = 0; tx < curW; tx++) {
              const srcIdx = ((y + ty) * pageWidth + (x + tx)) * 4;
              const dstIdx = (ty * curW + tx) * 4;
              tileBuf[dstIdx] = buffer[srcIdx];
              tileBuf[dstIdx + 1] = buffer[srcIdx + 1];
              tileBuf[dstIdx + 2] = buffer[srcIdx + 2];
              tileBuf[dstIdx + 3] = 255;
            }
          }

          const res = jsQR(tileBuf, curW, curH);
          if (res && res.data) {
            results.push({
              data: res.data,
              x: Math.round(res.location.topLeftCorner.x + x),
              y: Math.round(res.location.topLeftCorner.y + y),
              w: Math.round(res.location.bottomRightCorner.x - res.location.topLeftCorner.x),
              h: Math.round(res.location.bottomRightCorner.y - res.location.topLeftCorner.y),
            });
          }
        }
      }
      return results;
    },
  };
}

describe('GATE Multi-QR Scanner Test Suite', () => {
  // Test 1: Single QR code detection
  it('detects a single QR code on a page', () => {
    const page = createSyntheticPage(800, 600);
    page.drawQR('https://gate.example.com/q1', 100, 100, 4);
    const decoded = page.scanTiles();
    expect(decoded.length).toBeGreaterThanOrEqual(1);
    expect(decoded[0].data).toBe('https://gate.example.com/q1');
  });

  // Test 2: Two horizontally aligned QR codes
  it('detects two horizontally aligned QR codes on a page', () => {
    const page = createSyntheticPage(1200, 600);
    page.drawQR('https://gate.example.com/q1', 100, 100, 5);
    page.drawQR('https://gate.example.com/q2', 650, 100, 5);
    const decoded = page.scanTiles(2, 1, 0.2);
    const urls = decoded.map((d) => d.data);
    expect(urls).toContain('https://gate.example.com/q1');
    expect(urls).toContain('https://gate.example.com/q2');
  });

  // Test 3: Two vertically aligned QR codes
  it('detects two vertically aligned QR codes on a page', () => {
    const page = createSyntheticPage(800, 1000);
    page.drawQR('https://gate.example.com/top', 150, 100, 5);
    page.drawQR('https://gate.example.com/bottom', 150, 550, 5);
    const decoded = page.scanTiles(1, 2, 0.2);
    const urls = decoded.map((d) => d.data);
    expect(urls).toContain('https://gate.example.com/top');
    expect(urls).toContain('https://gate.example.com/bottom');
  });

  // Test 4: Four QR codes arranged in a 2x2 grid
  it('detects four QR codes in a 2x2 grid layout', () => {
    const page = createSyntheticPage(1200, 900);
    page.drawQR('https://gate.example.com/grid1', 100, 100, 5);
    page.drawQR('https://gate.example.com/grid2', 700, 100, 5);
    page.drawQR('https://gate.example.com/grid3', 100, 500, 5);
    page.drawQR('https://gate.example.com/grid4', 700, 500, 5);
    const decoded = page.scanTiles(2, 2, 0.25);
    const urls = new Set(decoded.map((d) => d.data));
    expect(urls.has('https://gate.example.com/grid1')).toBe(true);
    expect(urls.has('https://gate.example.com/grid2')).toBe(true);
    expect(urls.has('https://gate.example.com/grid3')).toBe(true);
    expect(urls.has('https://gate.example.com/grid4')).toBe(true);
  });

  // Test 5: QR codes of different sizes
  it('detects QR codes of different module sizes (small vs large)', () => {
    const page = createSyntheticPage(1000, 600);
    page.drawQR('https://gate.example.com/small', 80, 80, 3); // small
    page.drawQR('https://gate.example.com/large', 550, 80, 6); // large
    const decoded = page.scanTiles(2, 1, 0.2);
    const urls = decoded.map((d) => d.data);
    expect(urls).toContain('https://gate.example.com/small');
    expect(urls).toContain('https://gate.example.com/large');
  });

  // Test 6: QR codes containing plain text vs URLs
  it('handles plain text and URL payloads correctly', () => {
    const urlPayload = 'https://gateforum.com/questions/2024';
    const textPayload = 'WIFI:S:MyExamWifi;T:WPA;P:secret123;;';

    const resUrl = validateUrl(urlPayload);
    expect(resUrl.isUrl).toBe(true);
    expect(resUrl.parsedUrl).toBe(urlPayload);

    const resText = validateUrl(textPayload);
    expect(resText.isUrl).toBe(false);
    expect(resText.parsedUrl).toBeNull();
  });

  // Test 7: Two distinct physical QR codes containing the same URL
  it('preserves distinct physical QR codes that share the same URL without discarding', () => {
    const codeA: DecodedQRCode = {
      id: 'qr-1',
      rawContent: 'https://gate.example.com/same-link',
      parsedUrl: 'https://gate.example.com/same-link',
      isUrl: true,
      boundingBox: { x: 50, y: 50, width: 100, height: 100 },
      center: { x: 100, y: 100 },
      sequenceNumber: 1,
      questionNumber: 'Q1',
      questionConfidence: 'none',
      detectionStatus: 'decoded',
      isDuplicate: false,
      detectedBy: 'tile-scan',
    };

    const codeB: DecodedQRCode = {
      id: 'qr-2',
      rawContent: 'https://gate.example.com/same-link', // identical URL
      parsedUrl: 'https://gate.example.com/same-link',
      isUrl: true,
      boundingBox: { x: 500, y: 500, width: 100, height: 100 }, // physically distinct
      center: { x: 550, y: 550 },
      sequenceNumber: 2,
      questionNumber: 'Q4',
      questionConfidence: 'none',
      detectionStatus: 'decoded',
      isDuplicate: false,
      detectedBy: 'tile-scan',
    };

    const merged = deduplicateAndMergeCodes([codeA, codeB]);
    expect(merged.length).toBe(2); // Both must be preserved!
    expect(merged[0].isDuplicate).toBe(false);
    expect(merged[1].isDuplicate).toBe(true); // Flagged as repeated link
    expect(merged[1].duplicateOfId).toBe('qr-1');
  });

  // Test 8: Merges identical physical detections from overlapping passes
  it('merges multiple detections of the exact same physical QR code from overlapping tiles', () => {
    const pass1: DecodedQRCode = {
      id: 'tile1-code',
      rawContent: 'https://gate.example.com/unique',
      parsedUrl: 'https://gate.example.com/unique',
      isUrl: true,
      boundingBox: { x: 100, y: 100, width: 120, height: 120 },
      center: { x: 160, y: 160 },
      sequenceNumber: 0,
      questionNumber: '',
      questionConfidence: 'none',
      detectionStatus: 'decoded',
      isDuplicate: false,
      detectedBy: 'tile-scan',
    };

    // Overlapping tile detected the exact same physical code with minor pixel variance
    const pass2: DecodedQRCode = {
      id: 'tile2-code',
      rawContent: 'https://gate.example.com/unique',
      parsedUrl: 'https://gate.example.com/unique',
      isUrl: true,
      boundingBox: { x: 102, y: 99, width: 120, height: 120 },
      center: { x: 162, y: 159 },
      sequenceNumber: 0,
      questionNumber: '',
      questionConfidence: 'none',
      detectionStatus: 'decoded',
      isDuplicate: false,
      detectedBy: 'tile-scan',
    };

    const merged = deduplicateAndMergeCodes([pass1, pass2]);
    expect(merged.length).toBe(1); // Merged into 1 physical code
  });

  // Test 9: Image containing no QR codes
  it('returns empty results when an image contains no QR codes', () => {
    const page = createSyntheticPage(400, 400); // blank white page
    const decoded = page.scanTiles();
    expect(decoded.length).toBe(0);
  });

  // Test 10: Spatial reading order sorting (Top-to-bottom, Left-to-right)
  it('sorts codes spatially into row clusters and reading order', () => {
    const rawCodes: DecodedQRCode[] = [
      {
        id: 'c4',
        rawContent: 'Bottom Right',
        parsedUrl: null,
        isUrl: false,
        boundingBox: { x: 600, y: 505, width: 100, height: 100 },
        center: { x: 650, y: 555 },
        sequenceNumber: 0,
        questionNumber: '',
        questionConfidence: 'none',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'test',
      },
      {
        id: 'c2',
        rawContent: 'Top Right',
        parsedUrl: null,
        isUrl: false,
        boundingBox: { x: 600, y: 95, width: 100, height: 100 },
        center: { x: 650, y: 145 },
        sequenceNumber: 0,
        questionNumber: '',
        questionConfidence: 'none',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'test',
      },
      {
        id: 'c1',
        rawContent: 'Top Left',
        parsedUrl: null,
        isUrl: false,
        boundingBox: { x: 100, y: 105, width: 100, height: 100 },
        center: { x: 150, y: 155 },
        sequenceNumber: 0,
        questionNumber: '',
        questionConfidence: 'none',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'test',
      },
      {
        id: 'c3',
        rawContent: 'Bottom Left',
        parsedUrl: null,
        isUrl: false,
        boundingBox: { x: 100, y: 500, width: 100, height: 100 },
        center: { x: 150, y: 550 },
        sequenceNumber: 0,
        questionNumber: '',
        questionConfidence: 'none',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'test',
      },
    ];

    const sorted = sortQRCodesSpatial(rawCodes);
    expect(sorted[0].rawContent).toBe('Top Left');
    expect(sorted[0].sequenceNumber).toBe(1);
    expect(sorted[1].rawContent).toBe('Top Right');
    expect(sorted[1].sequenceNumber).toBe(2);
    expect(sorted[2].rawContent).toBe('Bottom Left');
    expect(sorted[2].sequenceNumber).toBe(3);
    expect(sorted[3].rawContent).toBe('Bottom Right');
    expect(sorted[3].sequenceNumber).toBe(4);
  });

  // Test 11: Question pattern extraction (Q1, Q.2, Question 3, Q15)
  it('extracts canonical question labels from diverse GATE question patterns', () => {
    expect(extractQuestionLabel('Q1')).toBe('Q1');
    expect(extractQuestionLabel('Q.2')).toBe('Q2');
    expect(extractQuestionLabel('Question 3')).toBe('Q3');
    expect(extractQuestionLabel('Question No. 15')).toBe('Q15');
    expect(extractQuestionLabel('Q2(a)')).toBe('Q2(a)');
    expect(extractQuestionLabel('Just some random text on the page 2024')).toBeNull();
  });

  // Test 12: Question spatial matching and confidence scoring
  it('associates nearby question text labels with QR codes and sets confidence', () => {
    const qrCode: DecodedQRCode = {
      id: 'qr-1',
      rawContent: 'https://gate.example.com/q1',
      parsedUrl: 'https://gate.example.com/q1',
      isUrl: true,
      boundingBox: { x: 100, y: 150, width: 100, height: 100 },
      center: { x: 150, y: 200 },
      sequenceNumber: 1,
      questionNumber: '',
      questionConfidence: 'none',
      detectionStatus: 'decoded',
      isDuplicate: false,
      detectedBy: 'test',
    };

    const textRegions: DetectedTextRegion[] = [
      {
        text: 'Q. 1 - Linear Algebra',
        confidence: 90,
        bbox: { x: 100, y: 90, width: 120, height: 25 }, // directly above QR code
        center: { x: 160, y: 102 },
      },
    ];

    const matched = matchQuestionsToQRCodes([qrCode], textRegions);
    expect(matched[0].questionNumber).toBe('Q1');
    expect(matched[0].questionConfidence).toBe('high');
  });

  // Test 13: Bulk copy formatting options
  it('formats bulk copy text according to selected CopyMode', () => {
    const codes: DecodedQRCode[] = [
      {
        id: '1',
        rawContent: 'https://link1.com',
        parsedUrl: 'https://link1.com',
        isUrl: true,
        boundingBox: { x: 0, y: 0, width: 50, height: 50 },
        center: { x: 25, y: 25 },
        sequenceNumber: 1,
        questionNumber: 'Q1',
        questionConfidence: 'confirmed',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'test',
      },
      {
        id: '2',
        rawContent: 'https://link2.com',
        parsedUrl: 'https://link2.com',
        isUrl: true,
        boundingBox: { x: 0, y: 100, width: 50, height: 50 },
        center: { x: 25, y: 125 },
        sequenceNumber: 2,
        questionNumber: 'Q2',
        questionConfidence: 'confirmed',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'test',
      },
    ];

    // URLs only
    expect(formatCopyOutput(codes, 'urls-only')).toBe('https://link1.com\nhttps://link2.com');

    // Question mapping
    expect(formatCopyOutput(codes, 'question-mapping')).toBe('Q1 | https://link1.com\nQ2 | https://link2.com');

    // Numbered links
    expect(formatCopyOutput(codes, 'numbered-links')).toBe('1. https://link1.com\n2. https://link2.com');
  });

  // Test 14: URL domain extraction
  it('extracts clean domains for badge previews', () => {
    expect(getDomainFromUrl('https://www.gateacademy.co.in/video/123')).toBe('gateacademy.co.in');
    expect(getDomainFromUrl('https://youtube.com/watch?v=abcd')).toBe('youtube.com');
    expect(getDomainFromUrl(null)).toBe('Plain Text');
  });

  // Test 15: Batch session and local history persistence
  it('saves, retrieves, and clears batch sessions via HistoryService', () => {
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      removeItem: (key: string) => { delete mockStorage[key]; },
    });

    const session: PageSession = {
      id: 'session-test-1',
      label: 'GATE EC 2024 — Page 18',
      timestamp: Date.now(),
      results: [],
      imageDimensions: { width: 1000, height: 1200 },
    };

    HistoryService.saveSession(session);
    const sessions = HistoryService.getSessions();
    expect(sessions.length).toBe(1);
    expect(sessions[0].label).toBe('GATE EC 2024 — Page 18');

    HistoryService.clearAll();
    expect(HistoryService.getSessions().length).toBe(0);

    vi.unstubAllGlobals();
  });

  // Test 16: PWA Manifest & Icons validation
  it('validates web app manifest structure and required icons', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const manifestPath = path.resolve(__dirname, '../public/manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('GATE Multi-QR Scanner');
    expect(manifest.short_name).toBe('GATE QR');
    expect(manifest.description).toBe('Scan multiple QR codes from a single image.');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBe('#2563eb');
    expect(manifest.background_color).toBe('#ffffff');

    // Verify icons exist on disk
    expect(fs.existsSync(path.resolve(__dirname, '../public/icons/icon-192.png'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../public/icons/icon-512.png'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../public/icons/icon-maskable-512.png'))).toBe(true);
  });
});
