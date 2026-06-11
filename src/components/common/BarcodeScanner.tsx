import React, { useEffect, useRef } from 'react';
import { Box, Dialog, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Quagga from '@ericblade/quagga2';

interface BarcodeScannerProps {
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onClose, 
  onScan,
  title = 'Skaner kodów kreskowych',
  subtitle = 'Umieść kod w polu widzenia kamery'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const scanBufferRef = useRef<{ [key: string]: number }>({});

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

  const handleDetected = (result: { codeResult?: { code?: string | null } }) => {
    if (!result?.codeResult?.code) {
      return;
    }
    const code = result.codeResult.code;
    
    if (code.includes('PYR')) {
      console.log('✅ Wykryto kod PYR:', code);
      stopQuagga();
      stopCamera();
      onScan(code);
      handleClose();
      return;
    }

    scanBufferRef.current[code] = (scanBufferRef.current[code] || 0) + 1;
    if (scanBufferRef.current[code] >= 3) {
      console.log('✅ Potwierdzono kod:', code);
      stopQuagga();
      stopCamera();
      onScan(code);
      handleClose();
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
          readers: ['code_128_reader'],
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
            {subtitle}
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};

export default BarcodeScanner; 