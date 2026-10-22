import {
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from '@zxing/library';
import jsQR from 'jsqr';
import { BoundingBox, DecodedQRCode, Point, ScanResult } from '../types';
import { deduplicateAndMergeCodes } from '../utils/deduplication';
import { sortQRCodesSpatial } from '../utils/sorting';
import { validateUrl } from '../utils/urlValidation';
import { ImageProcessor } from './imageProcessor';

// Declaration for modern BarcodeDetector Web API
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): {
        detect(image: ImageBitmapSource): Promise<Array<{
          rawValue: string;
          boundingBox: DOMRectReadOnly;
          cornerPoints: Array<{ x: number; y: number }>;
        }>>;
      };
      getSupportedFormats?(): Promise<string[]>;
    };
  }
}

export class QRDetectorService {
  /**
   * Primary entry point: Scans a canvas for multiple QR codes using a multi-tiered pipeline:
   * 1. Native BarcodeDetector (Android Chrome / Chromium)
   * 2. Iterative progressive masking with jsQR (finds a code, masks it, finds the next)
   * 3. ZXing QRCodeReader
   * 4. Multi-region overlapping grid tiling (for dense high-resolution pages)
   * 5. Enhanced filters on retry (contrast stretch, sharpening, grayscale)
   */
  static async scanMultiQR(
    canvas: HTMLCanvasElement,
    options: {
      useEnhancements?: boolean;
      tileScan?: boolean;
    } = {}
  ): Promise<ScanResult> {
    const startTime = performance.now();
    const rawDetected: DecodedQRCode[] = [];
    const enginesUsed: string[] = [];

    // Working canvas (or enhanced canvas if requested)
    let workingCanvas = canvas;
    if (options.useEnhancements) {
      workingCanvas = ImageProcessor.enhanceCanvas(canvas, {
        grayscale: true,
        contrastStretch: true,
        sharpen: true,
      });
      enginesUsed.push('enhanced-filter');
    }

    // 1. Try Native BarcodeDetector if supported (fastest & native multi-code accuracy)
    if (typeof window !== 'undefined' && window.BarcodeDetector) {
      try {
        const nativeResults = await this.detectWithNativeBarcodeDetector(workingCanvas);
        if (nativeResults.length > 0) {
          rawDetected.push(...nativeResults);
          enginesUsed.push('barcode-detector-api');
        }
      } catch (err) {
        console.warn('Native BarcodeDetector pass notice:', err);
      }
    }

    // 2. Iterative progressive masking on the full image using jsQR
    // Finds code 1, masks its finder patterns with neutral background, finds code 2, etc.
    try {
      const progressiveResults = this.detectProgressiveMasking(workingCanvas);
      if (progressiveResults.length > 0) {
        rawDetected.push(...progressiveResults);
        enginesUsed.push('jsqr-progressive-masking');
      }
    } catch (err) {
      console.warn('Progressive masking pass notice:', err);
    }

    // 3. ZXing QRCodeReader
    try {
      const zxingResults = await this.detectWithZXing(workingCanvas);
      if (zxingResults.length > 0) {
        rawDetected.push(...zxingResults);
        enginesUsed.push('zxing-reader');
      }
    } catch (err) {
      console.warn('ZXing pass notice:', err);
    }

    // 4. Overlapping Grid Tile Scanning:
    // When a page has 4+ codes or codes are small relative to page dimensions,
    // scanning 2x2 overlapping tiles guarantees regional detection.
    const shouldRunTileScan = options.tileScan || rawDetected.length < 4;
    if (shouldRunTileScan && (workingCanvas.width >= 500 || workingCanvas.height >= 500)) {
      try {
        const tileResults = await this.detectWithTiling(workingCanvas);
        if (tileResults.length > 0) {
          rawDetected.push(...tileResults);
          enginesUsed.push('adaptive-tiling');
        }
      } catch (err) {
        console.warn('Tile scan pass notice:', err);
      }
    }

    // 5. Merge duplicate detections of the same physical code and preserve distinct physical codes
    const merged = deduplicateAndMergeCodes(rawDetected);

    // 6. Sort into spatial reading order (Top to bottom, Left to right with adaptive row clustering)
    const sorted = sortQRCodesSpatial(merged);

    const processingTimeMs = Math.round(performance.now() - startTime);

    let warningMessage: string | undefined;
    if (sorted.length === 0) {
      warningMessage = 'No readable QR codes detected. Try taking a closer photo or improving lighting.';
    }

    return {
      items: sorted,
      totalDecoded: sorted.length,
      suspectedUnreadable: 0,
      processingTimeMs,
      engineUsed: enginesUsed.join(', ') || 'none',
      warningMessage,
    };
  }

  /**
   * Engine 1: Native BarcodeDetector API
   */
  private static async detectWithNativeBarcodeDetector(
    canvas: HTMLCanvasElement
  ): Promise<DecodedQRCode[]> {
    if (!window.BarcodeDetector) return [];

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const barcodes = await detector.detect(canvas);

    return barcodes.map((bc, idx) => {
      const bbox: BoundingBox = {
        x: Math.round(bc.boundingBox.x),
        y: Math.round(bc.boundingBox.y),
        width: Math.round(bc.boundingBox.width),
        height: Math.round(bc.boundingBox.height),
      };

      const center: Point = {
        x: Math.round(bbox.x + bbox.width / 2),
        y: Math.round(bbox.y + bbox.height / 2),
      };

      const { isUrl, parsedUrl } = validateUrl(bc.rawValue);

      return {
        id: `bc-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        rawContent: bc.rawValue,
        parsedUrl,
        isUrl,
        boundingBox: bbox,
        center,
        corners: bc.cornerPoints,
        sequenceNumber: 0,
        questionNumber: '',
        questionConfidence: 'none',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'barcode-detector',
      };
    });
  }

  /**
   * Engine 2: Progressive Masking Detection with jsQR.
   * Decodes a QR code, masks its bounding region with white pixels,
   * then re-scans the image until all distinct QR codes in the image are found.
   */
  public static detectProgressiveMasking(
    canvas: HTMLCanvasElement,
    offsetX = 0,
    offsetY = 0,
    maxIterations = 16
  ): DecodedQRCode[] {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    // Clone pixel data so we don't mutate original
    const workingPixels = new Uint8ClampedArray(imgData.data);

    const detected: DecodedQRCode[] = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      const code = jsQR(workingPixels, width, height, {
        inversionAttempts: 'attemptBoth',
      });

      if (!code || !code.data) {
        break; // No more decodable QR codes found
      }

      // Calculate global bounding box
      const corners: Point[] = [
        { x: Math.round(code.location.topLeftCorner.x + offsetX), y: Math.round(code.location.topLeftCorner.y + offsetY) },
        { x: Math.round(code.location.topRightCorner.x + offsetX), y: Math.round(code.location.topRightCorner.y + offsetY) },
        { x: Math.round(code.location.bottomRightCorner.x + offsetX), y: Math.round(code.location.bottomRightCorner.y + offsetY) },
        { x: Math.round(code.location.bottomLeftCorner.x + offsetX), y: Math.round(code.location.bottomLeftCorner.y + offsetY) },
      ];

      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;

      for (const p of corners) {
        const localX = p.x - offsetX;
        const localY = p.y - offsetY;
        if (localX < minX) minX = localX;
        if (localX > maxX) maxX = localX;
        if (localY < minY) minY = localY;
        if (localY > maxY) maxY = localY;
      }

      const bboxWidth = Math.max(20, maxX - minX);
      const bboxHeight = Math.max(20, maxY - minY);

      const bbox: BoundingBox = {
        x: Math.max(0, Math.round(minX + offsetX)),
        y: Math.max(0, Math.round(minY + offsetY)),
        width: Math.round(bboxWidth),
        height: Math.round(bboxHeight),
      };

      const center: Point = {
        x: Math.round(bbox.x + bbox.width / 2),
        y: Math.round(bbox.y + bbox.height / 2),
      };

      const { isUrl, parsedUrl } = validateUrl(code.data);

      detected.push({
        id: `prog-${iter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        rawContent: code.data,
        parsedUrl,
        isUrl,
        boundingBox: bbox,
        center,
        corners,
        sequenceNumber: 0,
        questionNumber: '',
        questionConfidence: 'none',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'jsqr-progressive',
      });

      // Mask out the detected QR code in workingPixels by painting it white with 15% margin
      const marginX = Math.round(bboxWidth * 0.15);
      const marginY = Math.round(bboxHeight * 0.15);
      const maskX0 = Math.max(0, minX - marginX);
      const maskY0 = Math.max(0, minY - marginY);
      const maskX1 = Math.min(width - 1, maxX + marginX);
      const maskY1 = Math.min(height - 1, maxY + marginY);

      for (let y = maskY0; y <= maskY1; y++) {
        for (let x = maskX0; x <= maskX1; x++) {
          const idx = (y * width + x) * 4;
          workingPixels[idx] = 255;     // R
          workingPixels[idx + 1] = 255; // G
          workingPixels[idx + 2] = 255; // B
          workingPixels[idx + 3] = 255; // A
        }
      }
    }

    return detected;
  }

  /**
   * Engine 3: ZXing QRCodeReader
   */
  private static async detectWithZXing(
    canvas: HTMLCanvasElement
  ): Promise<DecodedQRCode[]> {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const luminanceSource = new RGBLuminanceSource(
      imgData.data,
      canvas.width,
      canvas.height
    );
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new QRCodeReader();
    try {
      const res = reader.decode(binaryBitmap, hints);
      if (!res) return [];

      const rawText = res.getText();
      const points = res.getResultPoints() || [];

      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;

      const corners: Point[] = points.map((p) => ({
        x: Math.round(p.getX()),
        y: Math.round(p.getY()),
      }));

      for (const p of corners) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }

      const bbox: BoundingBox = {
        x: Math.max(0, Math.round(minX - 5)),
        y: Math.max(0, Math.round(minY - 5)),
        width: Math.round(Math.max(30, maxX - minX + 10)),
        height: Math.round(Math.max(30, maxY - minY + 10)),
      };

      const center: Point = {
        x: Math.round(bbox.x + bbox.width / 2),
        y: Math.round(bbox.y + bbox.height / 2),
      };

      const { isUrl, parsedUrl } = validateUrl(rawText);

      return [{
        id: `zxing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        rawContent: rawText,
        parsedUrl,
        isUrl,
        boundingBox: bbox,
        center,
        corners,
        sequenceNumber: 0,
        questionNumber: '',
        questionConfidence: 'none',
        detectionStatus: 'decoded',
        isDuplicate: false,
        detectedBy: 'zxing-reader',
      }];
    } catch {
      return [];
    }
  }

  /**
   * Engine 4: Adaptive Tiling scan with progressive masking in each tile
   */
  private static async detectWithTiling(
    canvas: HTMLCanvasElement
  ): Promise<DecodedQRCode[]> {
    // 2x2 grid with 25% overlap
    const tiles = ImageProcessor.extractTiles(canvas, 2, 2, 0.25);
    const detected: DecodedQRCode[] = [];

    for (let t = 0; t < tiles.length; t++) {
      const tile = tiles[t];
      const tileCodes = this.detectProgressiveMasking(
        tile.canvas,
        tile.offsetX,
        tile.offsetY,
        6 // up to 6 codes per tile
      );
      detected.push(...tileCodes);
    }

    return detected;
  }
}
