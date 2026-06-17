import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Quagga, { type QuaggaJSCodeReader } from '@ericblade/quagga2';

// In continuous mode, ignore the same code if re-read within this window
// (Quagga fires many detections per second; this dedupes a sticker still in view).
const CONTINUOUS_COOLDOWN_MS = 2500;

interface BarcodeScannerProps {
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
  /**
   * Quagga 1D readers to enable. Defaults to Code 128 only (PYR codes).
   * Pass a broader set when scanning arbitrary device serials (Code 39, EAN, …).
   */
  readers?: QuaggaJSCodeReader[];
  /**
   * Keep the camera open after each scan and emit every code via onScan
   * (the parent closes the scanner with the "Gotowe" button). For bulk
   * serial/PYR entry where you scan many items in a row.
   */
  continuous?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onClose,
  onScan,
  title = 'Skaner kodów kreskowych',
  subtitle = 'Umieść kod w polu widzenia kamery',
  readers = ['code_128_reader'],
  continuous = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const scanBufferRef = useRef<{ [key: string]: number }>({});
  // Continuous mode: timestamp of last accept per code, for cooldown dedupe
  const recentRef = useRef<{ [key: string]: number }>({});
  const [scanCount, setScanCount] = useState(0);
  const [lastCode, setLastCode] = useState('');

  const stopCamera = () => {
    try {
      const video = containerRef.current?.querySelector('video');
      if (video && video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        video.srcObject = null;
        console.log('🔴 Strumień kamery zatrzymany');
      }
    } catch {}
  };

  const stopQuagga = () => {
    try {
      Quagga.offDetected(handleDetected);
      Quagga.stop();
      console.log('🔴 Quagga zatrzymana');
    } catch {}
  };

  const acceptCode = (code: string) => {
    if (continuous) {
      // Keep scanning; dedupe the same code within the cooldown window.
      const now = Date.now();
      if (now - (recentRef.current[code] || 0) < CONTINUOUS_COOLDOWN_MS) {
        return;
      }
      recentRef.current[code] = now;
      scanBufferRef.current = {};
      console.log('✅ Zeskanowano (ciągły):', code);
      onScan(code);
      setScanCount((c) => c + 1);
      setLastCode(code);
      try { navigator.vibrate?.(50); } catch {}
      return;
    }
    // Single-shot: emit once and close.
    stopQuagga();
    stopCamera();
    onScan(code);
    handleClose();
  };

  const handleDetected = (result: { codeResult?: { code?: string | null } }) => {
    if (!result?.codeResult?.code) {
      return;
    }
    const code = result.codeResult.code;

    if (code.includes('PYR')) {
      acceptCode(code);
      return;
    }

    scanBufferRef.current[code] = (scanBufferRef.current[code] || 0) + 1;
    if (scanBufferRef.current[code] >= 3) {
      acceptCode(code);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const tryInitQuagga = () => {
      if (!containerRef.current) {
        setTimeout(tryInitQuagga, 100);
        return;
      }
      if (cancelled) return;

      Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target: containerRef.current,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          area: {
            top: '0%',
            right: '0%',
            left: '0%',
            bottom: '0%'
          },
          willReadFrequently: true
        },
        decoder: {
          readers,
          multiple: false
        },
        locate: true,
        numOfWorkers: 4,
        frequency: 10
      }, (err: unknown) => {
        if (err) {
          console.error('❌ Błąd inicjalizacji Quagga:', err);
          return;
        }
        Quagga.start();
        Quagga.onDetected(handleDetected);
      });
    };

    tryInitQuagga();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      stopQuagga();
      stopCamera();
      scanBufferRef.current = {};
      recentRef.current = {};
    };
    // Intentionally mount-only: camera/Quagga lifecycle must init and tear down
    // exactly once; handleDetected/stopQuagga are stable for the component's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    stopQuagga();
    stopCamera();
    onClose();
  };

  return (
    <Dialog
      open={true}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {title}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'grey.500',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box sx={{ p: 2 }}>
        <Box sx={{ 
          position: 'relative',
          width: '100%',
          height: '300px',
          maxWidth: 480,
          margin: '0 auto',
          bgcolor: '#000',
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          <div
            ref={containerRef}
            className="quagga-video-container"
            style={{
              width: '100%',
              height: '100%',
              minWidth: 200,
              minHeight: 200,
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
          {continuous && (
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: 'rgba(255, 152, 0, 0.9)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Zeskanowano: {scanCount}
            </Box>
          )}
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: 1,
            }}
          >
            {continuous && lastCode ? `Ostatni: ${lastCode}` : subtitle}
          </Typography>
        </Box>
        {continuous && (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            onClick={handleClose}
            sx={{ mt: 2 }}
          >
            Gotowe{scanCount > 0 ? ` (${scanCount})` : ''}
          </Button>
        )}
      </Box>
    </Dialog>
  );
};

export default BarcodeScanner; 