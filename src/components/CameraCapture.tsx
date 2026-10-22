import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Zap, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (capturedBlob: Blob) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      setIsInitializing(true);
      setErrorMessage(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Camera access is not supported by your browser. Please upload a photo instead.');
        setIsInitializing(false);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }

        // Check torch capability
        const track = mediaStream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          if (capabilities.torch) {
            setHasTorch(true);
          }
        }
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Camera permission was denied. You can upload a photograph instead.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('No camera was found on your device. Please upload a photograph.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMessage('Camera is currently in use by another application.');
        } else {
          setErrorMessage('Unable to initialize camera. You can upload a photograph instead.');
        }
      } finally {
        setIsInitializing(false);
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleTorch = async () => {
    if (!stream || !hasTorch) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Could not toggle flashlight:', err);
      }
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          onClose();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  return (
    <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camera Capture">
      <div className="camera-header">
        <button
          type="button"
          className="icon-btn-compact"
          onClick={onClose}
          aria-label="Close camera"
        >
          <X size={20} />
        </button>

        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Position GATE page in frame</span>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {hasTorch && (
            <button
              type="button"
              className="icon-btn-compact"
              onClick={toggleTorch}
              aria-label={torchOn ? 'Turn off flash' : 'Turn on flash'}
              style={{ color: torchOn ? '#facc15' : 'white' }}
            >
              <Zap size={18} />
            </button>
          )}

          <button
            type="button"
            className="icon-btn-compact"
            onClick={switchCamera}
            aria-label="Switch camera"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="camera-video-container">
        {errorMessage ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'white', maxWidth: '360px' }}>
            <AlertCircle size={44} style={{ color: 'var(--warning)', margin: '0 auto 1rem' }} />
            <p style={{ marginBottom: '1.25rem', fontSize: '0.9375rem' }}>{errorMessage}</p>
            <button type="button" className="btn-scan-primary" onClick={onClose} style={{ minHeight: '44px' }}>
              Return to Upload
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="camera-video-stream"
              playsInline
              muted
              autoPlay
            />
            <div className="camera-guideline-box" aria-hidden="true" />
          </>
        )}
      </div>

      {!errorMessage && (
        <div className="camera-controls-bottom">
          <button
            type="button"
            className="shutter-btn"
            onClick={capturePhoto}
            disabled={isInitializing}
            aria-label="Capture photograph"
            id="btn-shutter-capture"
          >
            <div className="shutter-inner" />
          </button>
        </div>
      )}
    </div>
  );
};
