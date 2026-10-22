import React, { useState, useEffect, useRef } from 'react';
import { AppHeader } from './components/AppHeader';
import { ImageInput } from './components/ImageInput';
import { CameraCapture } from './components/CameraCapture';
import { ImagePreview } from './components/ImagePreview';
import { ScanControls } from './components/ScanControls';
import { ResultList } from './components/ResultList';
import { StatusMessage } from './components/StatusMessage';
import { BatchSessionModal } from './components/BatchSessionModal';
import { ImageProcessor } from './services/imageProcessor';
import { QRDetectorService } from './services/qrDetector';
import { QuestionOCRService } from './services/questionOcr';
import { matchQuestionsToQRCodes } from './services/questionMatcher';
import { HistoryService } from './services/historyService';
import { usePwaInstall } from './hooks/usePwaInstall';
import { DecodedQRCode, PageSession } from './types';

export const App: React.FC = () => {
  const { isInstallable, installApp } = usePwaInstall();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [scanStatus, setScanStatus] = useState<'idle' | 'ready' | 'scanning' | 'ocr'>('idle');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  
  const [results, setResults] = useState<DecodedQRCode[]>([]);
  const [selectedCodeId, setSelectedCodeId] = useState<string | undefined>(undefined);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [sessions, setSessions] = useState<PageSession[]>([]);
  const [pageLabel, setPageLabel] = useState<string>('Page 1');
  const [ocrProgressText, setOcrProgressText] = useState<string | undefined>(undefined);

  // Keep reference to loaded HTMLImageElement for canvas extraction
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Load sessions from LocalStorage on initial mount
  useEffect(() => {
    const saved = HistoryService.getSessions();
    setSessions(saved);
  }, []);

  // Handle selected image from file upload or camera capture
  const handleImageLoaded = async (source: File | Blob | string) => {
    try {
      setScanStatus('scanning');
      setStatusMessage({ type: 'info', text: 'Loading photograph and analyzing page dimensions...' });

      let img: HTMLImageElement;
      let displayUrl: string;

      if (typeof source === 'string') {
        displayUrl = source;
        img = await ImageProcessor.loadImage(source);
      } else {
        const fileObj = source instanceof File ? source : new File([source], 'camera-capture.jpg', { type: 'image/jpeg' });
        displayUrl = URL.createObjectURL(fileObj);
        img = await ImageProcessor.loadImage(fileObj);
      }

      loadedImageRef.current = img;
      setImageSrc(displayUrl);
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setRotation(0);
      setResults([]);
      setSelectedCodeId(undefined);

      // Perform initial multi-QR scan automatically upon loading
      await executeScan(img, 0, false);
    } catch (err: any) {
      console.error('Error loading image:', err);
      setScanStatus('idle');
      setStatusMessage({
        type: 'error',
        text: 'Failed to process the photograph. Please ensure it is a valid JPEG, PNG or WebP image.',
      });
    }
  };

  // Perform QR code detection on the current image
  const executeScan = async (
    img: HTMLImageElement | null = loadedImageRef.current,
    currentRotation = rotation,
    useEnhancements = false
  ) => {
    if (!img) return;

    try {
      setScanStatus('scanning');
      setStatusMessage({
        type: 'info',
        text: useEnhancements
          ? 'Running enhanced multi-pass detection with contrast optimization and sharpening...'
          : 'Searching for multiple QR codes across page...',
      });

      // Create working canvas respecting rotation
      const canvas = ImageProcessor.createWorkingCanvas(img, currentRotation);

      const scanResult = await QRDetectorService.scanMultiQR(canvas, {
        useEnhancements,
        tileScan: true,
      });

      setResults(scanResult.items);

      if (scanResult.items.length > 0) {
        setScanStatus('ready');
        const countText = scanResult.items.length === 1 ? '1 QR code' : `${scanResult.items.length} QR codes`;
        setStatusMessage({
          type: 'success',
          text: `Found ${countText} in ${scanResult.processingTimeMs}ms, sorted in top-to-bottom reading order.`,
        });
      } else {
        setScanStatus('ready');
        setStatusMessage({
          type: 'warning',
          text: 'No QR codes found. Try moving closer, improving lighting, or clicking "Improve Detection".',
        });
      }
    } catch (err: any) {
      console.error('Scan execution error:', err);
      setScanStatus('ready');
      setStatusMessage({
        type: 'error',
        text: 'Scanning encountered an issue. You can retry or rotate the photograph.',
      });
    }
  };

  // Rotate image 90 degrees
  const handleRotate = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    if (loadedImageRef.current) {
      executeScan(loadedImageRef.current, nextRotation, false);
    }
  };

  // Run Question Number OCR
  const handleRunOcr = async () => {
    if (!loadedImageRef.current || results.length === 0) return;

    try {
      setScanStatus('ocr');
      setOcrProgressText('Initializing OCR...');
      setStatusMessage({ type: 'info', text: 'Reading printed text to detect question numbers (Q1, Q2, etc.)...' });

      const canvas = ImageProcessor.createWorkingCanvas(loadedImageRef.current, rotation);
      const textRegions = await QuestionOCRService.recognizeTextRegions(canvas, (progress, status) => {
        setOcrProgressText(`${status} (${progress}%)`);
      });

      const matched = matchQuestionsToQRCodes(results, textRegions);
      setResults(matched);

      const matchedCount = matched.filter((c) => c.questionNumber).length;
      setScanStatus('ready');

      if (matchedCount > 0) {
        setStatusMessage({
          type: 'success',
          text: `Matched ${matchedCount} question ${matchedCount === 1 ? 'number' : 'numbers'} to QR codes. You can edit any if needed.`,
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Could not confidently match question labels automatically. You can enter them manually on each card.',
        });
      }
    } catch (err) {
      console.warn('OCR error:', err);
      setScanStatus('ready');
      setStatusMessage({
        type: 'warning',
        text: 'Question number OCR is currently unavailable. Your QR scan results are unaffected and question numbers can be added manually.',
      });
    } finally {
      setOcrProgressText(undefined);
    }
  };

  // Clear current image and reset view
  const handleClear = () => {
    if (results.length > 0 && !window.confirm('Clear current image and scan results?')) {
      return;
    }
    setImageSrc(null);
    setImageDimensions({ width: 0, height: 0 });
    setResults([]);
    setSelectedCodeId(undefined);
    setScanStatus('idle');
    setStatusMessage(null);
    loadedImageRef.current = null;
  };

  // Update question number on a result
  const handleUpdateQuestionNumber = (codeId: string, newNumber: string) => {
    setResults((prev) =>
      prev.map((code) =>
        code.id === codeId
          ? {
              ...code,
              questionNumber: newNumber,
              questionConfidence: newNumber ? 'confirmed' : 'none',
            }
          : code
      )
    );
  };

  // Remove a result
  const handleRemoveResult = (codeId: string) => {
    setResults((prev) => {
      const filtered = prev.filter((c) => c.id !== codeId);
      return filtered.map((c, i) => ({ ...c, sequenceNumber: i + 1 }));
    });
  };

  // Save current page to batch session
  const handleSaveToBatch = () => {
    if (results.length === 0 || !loadedImageRef.current) return;

    const canvas = ImageProcessor.createWorkingCanvas(loadedImageRef.current, rotation);
    const thumbnail = HistoryService.createThumbnail(canvas);

    const session: PageSession = {
      id: `session-${Date.now()}`,
      label: pageLabel,
      timestamp: Date.now(),
      thumbnail,
      results,
      imageDimensions,
    };

    HistoryService.saveSession(session);
    setSessions(HistoryService.getSessions());

    setStatusMessage({
      type: 'success',
      text: `Saved "${pageLabel}" with ${results.length} links to batch session history!`,
    });

    // Advance default label for next page (e.g. "Page 1" -> "Page 2")
    const match = pageLabel.match(/(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      setPageLabel(pageLabel.replace(/\d+$/, nextNum.toString()));
    } else {
      setPageLabel(`Page ${sessions.length + 2}`);
    }
  };

  // Load a session from history
  const handleSelectSession = (session: PageSession) => {
    setResults(session.results);
    setPageLabel(session.label);
    if (session.thumbnail) {
      setImageSrc(session.thumbnail);
    }
    setImageDimensions(session.imageDimensions);
    setScanStatus('ready');
    setStatusMessage({
      type: 'info',
      text: `Loaded saved session "${session.label}" (${session.results.length} QR codes).`,
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    HistoryService.deleteSession(sessionId);
    setSessions(HistoryService.getSessions());
  };

  const handleClearAllHistory = () => {
    HistoryService.clearAll();
    setSessions([]);
    setStatusMessage({ type: 'info', text: 'All scan history has been cleared.' });
  };

  const handleRenameSession = (sessionId: string, newLabel: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      HistoryService.saveSession({ ...target, label: newLabel });
      setSessions(HistoryService.getSessions());
    }
  };

  return (
    <div className="app-container">
      <AppHeader
        status={scanStatus}
        statusMessage={statusMessage?.text}
        onOpenHistory={() => setShowHistory(true)}
        historyCount={sessions.length}
        isInstallable={isInstallable}
        onInstallApp={installApp}
      />

      <main className="main-content">
        {statusMessage && (
          <StatusMessage
            type={statusMessage.type}
            message={statusMessage.text}
            onDismiss={() => setStatusMessage(null)}
          />
        )}

        {!imageSrc ? (
          <ImageInput
            onImageSelected={handleImageLoaded}
            onOpenCamera={() => setShowCamera(true)}
            disabled={scanStatus === 'scanning'}
          />
        ) : (
          <>
            <ImagePreview
              imageSrc={imageSrc}
              imageDimensions={imageDimensions}
              detectedCodes={results}
              rotation={rotation}
              onRotate={handleRotate}
              onReplace={() => {
                const input = document.getElementById('page-file-upload');
                input?.click();
              }}
              onClear={handleClear}
              selectedCodeId={selectedCodeId}
              onSelectCode={(id) => setSelectedCodeId(id)}
            />

            <ScanControls
              isScanning={scanStatus === 'scanning'}
              isOcrRunning={scanStatus === 'ocr'}
              ocrProgressMessage={ocrProgressText}
              hasResults={results.length > 0}
              onScan={() => executeScan(loadedImageRef.current, rotation, false)}
              onEnhancedScan={() => executeScan(loadedImageRef.current, rotation, true)}
              onRunOcr={handleRunOcr}
            />

            <ResultList
              results={results}
              onUpdateQuestionNumber={handleUpdateQuestionNumber}
              onReorder={setResults}
              onRemove={handleRemoveResult}
              onSaveToBatch={handleSaveToBatch}
              selectedCodeId={selectedCodeId}
              onSelectCode={(id) => setSelectedCodeId(id)}
              pageLabel={pageLabel}
            />
          </>
        )}
      </main>

      {/* Hidden file input for "Replace" option */}
      <input
        type="file"
        id="page-file-upload"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageLoaded(file);
        }}
      />

      {/* Full-frame camera modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleImageLoaded}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* History and batch modal */}
      {showHistory && (
        <BatchSessionModal
          sessions={sessions}
          onClose={() => setShowHistory(false)}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onClearAll={handleClearAllHistory}
          onRenameSession={handleRenameSession}
        />
      )}
    </div>
  );
};

export default App;
