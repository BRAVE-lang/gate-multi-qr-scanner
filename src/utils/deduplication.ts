import { BoundingBox, DecodedQRCode, Point } from '../types';

/**
 * Calculates Intersection over Union (IoU) of two bounding boxes
 */
export function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;
  const unionArea = boxAArea + boxBArea - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

/**
 * Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Deduplicates raw detections from multiple passes:
 * 1. Merges detections of the SAME physical code (same content + overlapping bounding box).
 * 2. Flags distinct physical codes that share the same URL as duplicates, without discarding them.
 */
export function deduplicateAndMergeCodes(rawCodes: DecodedQRCode[]): DecodedQRCode[] {
  if (rawCodes.length <= 1) return rawCodes;

  const mergedPhysicalCodes: DecodedQRCode[] = [];

  for (const candidate of rawCodes) {
    // Check if this candidate is an overlapping detection of an already collected physical code
    const existingIndex = mergedPhysicalCodes.findIndex((existing) => {
      // Must have matching payload
      if (existing.rawContent !== candidate.rawContent) return false;

      // Check physical proximity
      const avgSize = (
        (existing.boundingBox.width + existing.boundingBox.height + 
         candidate.boundingBox.width + candidate.boundingBox.height) / 4
      );
      const centerDist = distance(existing.center, candidate.center);
      const iou = calculateIoU(existing.boundingBox, candidate.boundingBox);

      // If centers are close or boxes overlap significantly, they are the same physical code
      return centerDist < avgSize * 0.75 || iou > 0.25;
    });

    if (existingIndex >= 0) {
      // Duplicate detection of same physical code:
      // Keep the detection with larger/better bounding box or preserve preferred metadata
      const existing = mergedPhysicalCodes[existingIndex];
      const existingArea = existing.boundingBox.width * existing.boundingBox.height;
      const candidateArea = candidate.boundingBox.width * candidate.boundingBox.height;

      if (candidateArea > existingArea) {
        mergedPhysicalCodes[existingIndex] = {
          ...candidate,
          id: existing.id, // Preserve original ID
        };
      }
    } else {
      mergedPhysicalCodes.push(candidate);
    }
  }

  // Second pass: Mark distinct physical codes that have identical content
  // so the user knows they share the same URL, and the UI can offer "Hide repeated links"
  const contentToFirstId = new Map<string, string>();

  return mergedPhysicalCodes.map((code) => {
    if (contentToFirstId.has(code.rawContent)) {
      const firstId = contentToFirstId.get(code.rawContent)!;
      return {
        ...code,
        isDuplicate: true,
        duplicateOfId: firstId,
      };
    } else {
      contentToFirstId.set(code.rawContent, code.id);
      return {
        ...code,
        isDuplicate: false,
      };
    }
  });
}
