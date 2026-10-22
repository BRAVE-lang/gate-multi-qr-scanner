export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type QuestionConfidence = 'confirmed' | 'high' | 'review' | 'none';

export interface DecodedQRCode {
  id: string;
  rawContent: string;
  parsedUrl: string | null;
  isUrl: boolean;
  boundingBox: BoundingBox;
  center: Point;
  corners?: Point[];
  sequenceNumber: number;
  questionNumber: string;
  questionConfidence: QuestionConfidence;
  detectionStatus: 'decoded' | 'suspect';
  isDuplicate: boolean;
  duplicateOfId?: string;
  detectedBy: string;
}

export interface ScanResult {
  items: DecodedQRCode[];
  totalDecoded: number;
  suspectedUnreadable: number;
  processingTimeMs: number;
  engineUsed: string;
  warningMessage?: string;
}

export interface PageSession {
  id: string;
  label: string;
  timestamp: number;
  thumbnail?: string;
  results: DecodedQRCode[];
  imageDimensions: { width: number; height: number };
}

export type CopyMode = 'urls-only' | 'question-mapping' | 'numbered-links' | 'raw-all';

export interface DetectedTextRegion {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  center: Point;
  questionLabel?: string;
}
