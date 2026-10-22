import React, { useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut, RefreshCw, Trash2 } from 'lucide-react';
import { DecodedQRCode } from '../types';
import { DetectionOverlay } from './DetectionOverlay';

interface ImagePreviewProps {
  imageSrc: string;
  imageDimensions: { width: number; height: number };
  detectedCodes: DecodedQRCode[];
  rotation: number;
  onRotate: () => void;
  onReplace: () => void;
  onClear: () => void;
  selectedCodeId?: string;
  onSelectCode?: (codeId: string) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageSrc,
  imageDimensions,
  detectedCodes,
  rotation,
  onRotate,
  onReplace,
  onClear,
  selectedCodeId,
  onSelectCode,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(2.5, prev + 0.25));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(1, prev - 0.25));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="preview-container">
      <div className="image-canvas-wrapper">
        <div
          style={{
            position: 'relative',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
          }}
        >
          <img
            src={imageSrc}
            alt="Captured GATE book page preview"
            className="preview-image"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          />

          {/* Overlay renders when unrotated; rotation updates canvas coordinates */}
          {rotation === 0 && (
            <DetectionOverlay
              detectedCodes={detectedCodes}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
              selectedCodeId={selectedCodeId}
              onSelectCode={onSelectCode}
            />
          )}
        </div>
      </div>

      <div className="preview-toolbar">
        <div className="toolbar-btn-group">
          <button
            type="button"
            className="icon-btn-compact"
            onClick={onRotate}
            title="Rotate 90° Clockwise"
            aria-label="Rotate image 90 degrees"
          >
            <RotateCw size={17} />
          </button>

          <button
            type="button"
            className="icon-btn-compact"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2.5}
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn size={17} />
          </button>

          <button
            type="button"
            className="icon-btn-compact"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut size={17} />
          </button>

          {zoomLevel > 1 && (
            <button
              type="button"
              className="btn-pill-light"
              onClick={handleResetZoom}
            >
              Reset {Math.round(zoomLevel * 100)}%
            </button>
          )}
        </div>

        <div className="toolbar-btn-group">
          <button
            type="button"
            className="btn-pill-light"
            onClick={onReplace}
            title="Choose another image"
          >
            <RefreshCw size={14} />
            <span>Replace</span>
          </button>

          <button
            type="button"
            className="icon-btn-compact"
            onClick={onClear}
            title="Clear and discard"
            aria-label="Clear image"
            style={{ color: '#f87171' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
