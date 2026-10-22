import React from 'react';
import { DecodedQRCode } from '../types';

interface DetectionOverlayProps {
  detectedCodes: DecodedQRCode[];
  imageWidth: number;
  imageHeight: number;
  onSelectCode?: (codeId: string) => void;
  selectedCodeId?: string;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detectedCodes,
  imageWidth,
  imageHeight,
  onSelectCode,
  selectedCodeId,
}) => {
  if (detectedCodes.length === 0 || !imageWidth || !imageHeight) {
    return null;
  }

  return (
    <svg
      className="detection-overlay-svg"
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {detectedCodes.map((code) => {
        const isSelected = selectedCodeId === code.id;
        const bbox = code.boundingBox;

        // Badge position above top-left corner
        const badgeX = Math.max(10, bbox.x);
        const badgeY = Math.max(28, bbox.y - 8);

        const badgeLabel = code.questionNumber
          ? `#${code.sequenceNumber} (${code.questionNumber})`
          : `#${code.sequenceNumber}`;

        return (
          <g
            key={code.id}
            className="qr-badge-group"
            onClick={() => onSelectCode?.(code.id)}
            role="button"
            tabIndex={0}
            aria-label={`QR Code ${code.sequenceNumber}`}
          >
            {/* Bounding Box rectangle */}
            <rect
              x={bbox.x}
              y={bbox.y}
              width={bbox.width}
              height={bbox.height}
              rx={6}
              className="qr-bounding-polygon"
              style={{
                stroke: isSelected ? '#f59e0b' : '#38bdf8',
                strokeWidth: isSelected ? 4 : 2.5,
                fill: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(37, 99, 235, 0.15)',
              }}
            />

            {/* Corner Markers */}
            <circle cx={bbox.x} cy={bbox.y} r={4} fill="#38bdf8" />
            <circle cx={bbox.x + bbox.width} cy={bbox.y} r={4} fill="#38bdf8" />
            <circle cx={bbox.x} cy={bbox.y + bbox.height} r={4} fill="#38bdf8" />
            <circle cx={bbox.x + bbox.width} cy={bbox.y + bbox.height} r={4} fill="#38bdf8" />

            {/* Sequence & Question Number Pill Badge */}
            <rect
              x={badgeX}
              y={badgeY - 20}
              width={badgeLabel.length * 9.5 + 16}
              height={24}
              rx={12}
              fill={isSelected ? '#d97706' : '#2563eb'}
              stroke="#ffffff"
              strokeWidth={1.5}
            />

            <text
              x={badgeX + 8}
              y={badgeY - 4}
              fill="#ffffff"
              fontSize="12"
              fontWeight="bold"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {badgeLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
