import React, { useRef } from 'react';
import { Camera, Upload, ShieldCheck, Image as ImageIcon } from 'lucide-react';

interface ImageInputProps {
  onImageSelected: (file: File) => void;
  onOpenCamera: () => void;
  disabled?: boolean;
}

export const ImageInput: React.FC<ImageInputProps> = ({
  onImageSelected,
  onOpenCamera,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
    // Reset file input value so selecting the same file again triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const validateAndProcess = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid JPEG, PNG, or WebP image file.');
      return;
    }

    // Configurable size limit: 30MB
    if (file.size > 30 * 1024 * 1024) {
      alert('The selected photograph is larger than 30MB. Please choose a slightly smaller file.');
      return;
    }

    onImageSelected(file);
  };

  return (
    <div className="image-input-section" onDrop={handleDrop} onDragOver={handleDragOver}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        id="page-file-upload"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <div className="primary-actions-grid">
        <button
          type="button"
          className="action-card-btn camera-btn"
          onClick={onOpenCamera}
          disabled={disabled}
          id="btn-take-photo"
          aria-label="Take Photo of book page using camera"
        >
          <div className="action-icon-circle">
            <Camera size={24} />
          </div>
          <span>Take Photo</span>
        </button>

        <button
          type="button"
          className="action-card-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          id="btn-upload-photo"
          aria-label="Upload Photo of book page from device"
        >
          <div className="action-icon-circle" style={{ color: 'var(--text-main)' }}>
            <Upload size={24} />
          </div>
          <span>Upload Photo</span>
        </button>
      </div>

      <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
        <button
          type="button"
          className="btn-secondary-tool"
          onClick={async () => {
            try {
              const res = await fetch('/sample-pages/gate_sample_page_4qr.svg');
              const blob = await res.blob();
              const file = new File([blob], 'gate_sample_page_4qr.svg', { type: 'image/svg+xml' });
              onImageSelected(file);
            } catch (err) {
              console.error('Failed to load sample page:', err);
            }
          }}
          disabled={disabled}
          id="btn-try-sample"
          style={{ width: '100%', justifyContent: 'center', padding: '0.625rem 1rem' }}
        >
          <ImageIcon size={16} style={{ color: 'var(--primary)' }} />
          <span>Try with Sample GATE Book Page (4 QR Codes)</span>
        </button>
      </div>

      <div className="privacy-banner" style={{ marginTop: '0.75rem' }}>
        <ShieldCheck size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
        <span>
          <strong>100% Private & Client-side:</strong> Your book photographs are processed in your browser and are not uploaded by this application.
        </span>
      </div>
    </div>
  );
};
