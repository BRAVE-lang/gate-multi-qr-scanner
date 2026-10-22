import { createWorker } from 'tesseract.js';
import { BoundingBox, DetectedTextRegion, Point } from '../types';

export class QuestionOCRService {
  private static workerPromise: ReturnType<typeof createWorker> | null = null;

  /**
   * Initializes or reuses the Tesseract worker
   */
  private static async getWorker(onProgress?: (progress: number, status: string) => void) {
    if (!this.workerPromise) {
      this.workerPromise = createWorker('eng', 1, {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text') {
            onProgress(Math.round(m.progress * 100), 'Recognizing question numbers...');
          } else if (onProgress && m.status) {
            onProgress(0, m.status);
          }
        },
      });
    }
    return this.workerPromise;
  }

  /**
   * Runs OCR on the canvas and extracts text blocks with bounding boxes
   */
  static async recognizeTextRegions(
    canvas: HTMLCanvasElement,
    onProgress?: (progress: number, status: string) => void
  ): Promise<DetectedTextRegion[]> {
    try {
      if (onProgress) onProgress(5, 'Initializing OCR engine...');
      const worker = await this.getWorker(onProgress);

      if (onProgress) onProgress(20, 'Analyzing page text...');
      const ret = await worker.recognize(canvas);

      const regions: DetectedTextRegion[] = [];

      // Extract lines or words that match candidate question formats
      if (ret.data && ret.data.lines) {
        for (const line of ret.data.lines) {
          const text = line.text ? line.text.trim() : '';
          if (!text) continue;

          const bbox: BoundingBox = {
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: Math.max(10, line.bbox.x1 - line.bbox.x0),
            height: Math.max(10, line.bbox.y1 - line.bbox.y0),
          };

          const center: Point = {
            x: Math.round(bbox.x + bbox.width / 2),
            y: Math.round(bbox.y + bbox.height / 2),
          };

          regions.push({
            text,
            confidence: line.confidence,
            bbox,
            center,
          });
        }
      }

      if (onProgress) onProgress(100, 'OCR Complete');
      return regions;
    } catch (err) {
      console.warn('OCR processing encountered error (QR scanning remains operational):', err);
      throw err;
    }
  }

  /**
   * Terminates the worker if needed to free mobile memory
   */
  static async terminate() {
    if (this.workerPromise) {
      const worker = await this.workerPromise;
      await worker.terminate();
      this.workerPromise = null;
    }
  }
}
