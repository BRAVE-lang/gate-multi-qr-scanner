export interface TileInfo {
  canvas: HTMLCanvasElement;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export class ImageProcessor {
  /**
   * Loads an image from File or URL into an HTMLImageElement
   */
  static loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      if (typeof source === 'string') {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image from source'));
        img.src = source;
      } else {
        const objectUrl = URL.createObjectURL(source);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image file'));
        };
        img.src = objectUrl;
      }
    });
  }

  /**
   * Creates a working canvas with optional rotation and scale limits for mobile memory safety
   */
  static createWorkingCanvas(
    img: HTMLImageElement,
    rotation: number = 0,
    maxDimension: number = 2560
  ): HTMLCanvasElement {
    const isRotatedQuarter = rotation === 90 || rotation === 270;
    const origWidth = isRotatedQuarter ? img.naturalHeight : img.naturalWidth;
    const origHeight = isRotatedQuarter ? img.naturalWidth : img.naturalHeight;

    let targetWidth = origWidth;
    let targetHeight = origHeight;

    // Scale down if exceeds maxDimension
    if (Math.max(origWidth, origHeight) > maxDimension) {
      const scale = maxDimension / Math.max(origWidth, origHeight);
      targetWidth = Math.round(origWidth * scale);
      targetHeight = Math.round(origHeight * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not create canvas 2D context');

    ctx.save();
    // Handle rotation around center
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawW = isRotatedQuarter ? targetHeight : targetWidth;
    const drawH = isRotatedQuarter ? targetWidth : targetHeight;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return canvas;
  }

  /**
   * Converts a canvas to an enhanced version:
   * options:
   * - grayscale
   * - contrastStretch (0 to 1)
   * - sharpen (boolean)
   */
  static enhanceCanvas(
    sourceCanvas: HTMLCanvasElement,
    options: {
      grayscale?: boolean;
      contrastStretch?: boolean;
      sharpen?: boolean;
    } = {}
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return sourceCanvas;

    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const totalPixels = data.length / 4;

    // 1. Grayscale
    if (options.grayscale || options.contrastStretch) {
      for (let i = 0; i < data.length; i += 4) {
        // Luminance formula
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }

    // 2. Contrast stretching (min-max normalization with 1% quantile cutoff)
    if (options.contrastStretch) {
      let minVal = 255;
      let maxVal = 0;

      for (let i = 0; i < data.length; i += 4) {
        const val = data[i];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }

      if (maxVal > minVal && (maxVal - minVal) < 220) {
        const range = maxVal - minVal;
        for (let i = 0; i < data.length; i += 4) {
          const stretched = Math.min(255, Math.max(0, ((data[i] - minVal) / range) * 255));
          data[i] = stretched;
          data[i + 1] = stretched;
          data[i + 2] = stretched;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 3. Sharpening filter using 3x3 convolution kernel:
    // [  0, -1,  0 ]
    // [ -1,  5, -1 ]
    // [  0, -1,  0 ]
    if (options.sharpen) {
      const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const dstData = ctx.createImageData(canvas.width, canvas.height);
      const src = srcData.data;
      const dst = dstData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Copy borders
      dst.set(src);

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          const up = ((y - 1) * w + x) * 4;
          const down = ((y + 1) * w + x) * 4;
          const left = (y * w + (x - 1)) * 4;
          const right = (y * w + (x + 1)) * 4;

          for (let c = 0; c < 3; c++) {
            const val = 5 * src[idx + c] - src[up + c] - src[down + c] - src[left + c] - src[right + c];
            dst[idx + c] = Math.min(255, Math.max(0, val));
          }
          dst[idx + 3] = 255; // Alpha
        }
      }
      ctx.putImageData(dstData, 0, 0);
    }

    return canvas;
  }

  /**
   * Slices a canvas into overlapping grid tiles for high-resolution multi-region detection.
   * Enables finding small QR codes on dense book pages.
   */
  static extractTiles(
    sourceCanvas: HTMLCanvasElement,
    gridX = 2,
    gridY = 2,
    overlapPercent = 0.25
  ): TileInfo[] {
    const tiles: TileInfo[] = [];
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;

    // Only tile if the image is reasonably large
    if (srcW < 800 && srcH < 800) {
      return [{
        canvas: sourceCanvas,
        offsetX: 0,
        offsetY: 0,
        width: srcW,
        height: srcH
      }];
    }

    const tileW = Math.ceil(srcW / gridX);
    const tileH = Math.ceil(srcH / gridY);
    const stepX = Math.round(tileW * (1 - overlapPercent));
    const stepY = Math.round(tileH * (1 - overlapPercent));

    for (let y = 0; y < srcH; y += stepY) {
      const currentTileH = Math.min(tileH, srcH - y);
      if (currentTileH < 150) continue;

      for (let x = 0; x < srcW; x += stepX) {
        const currentTileW = Math.min(tileW, srcW - x);
        if (currentTileW < 150) continue;

        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = currentTileW;
        tileCanvas.height = currentTileH;
        const ctx = tileCanvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(sourceCanvas, x, y, currentTileW, currentTileH, 0, 0, currentTileW, currentTileH);
          tiles.push({
            canvas: tileCanvas,
            offsetX: x,
            offsetY: y,
            width: currentTileW,
            height: currentTileH
          });
        }
      }
    }

    return tiles;
  }
}
