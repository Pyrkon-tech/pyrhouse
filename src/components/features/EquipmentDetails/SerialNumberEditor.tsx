import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import QrCodeScanner from '@mui/icons-material/QrCodeScanner';
import BarcodeScanner from '../../common/BarcodeScanner';

interface SerialNumberEditorProps {
  serial: string | null | undefined;
  /** Saves the serial; resolves to true on success (editor closes itself then) */
  onSave: (serial: string) => Promise<boolean>;
  /** Called after a barcode scan fills the input (parent shows the snackbar) */
  onScanComplete?: () => void;
}

const SerialNumberEditor: React.FC<SerialNumberEditorProps> = ({ serial, onSave, onScanComplete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [serialInput, setSerialInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleCancel = () => {
    setIsEditing(false);
    setSerialInput('');
    setShowModal(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (await onSave(serialInput.trim())) {
        handleCancel();
      }
    } finally {
      setSaving(false);
    }
  };

  if (serial !== null && serial !== undefined) {
    return (
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {serial}
      </Typography>
    );
  }

  return (
    <>
      {isEditing ? (
        <>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1, alignItems: 'center', width: '100%' }}>
            <TextField
              size="small"
              value={serialInput}
              onChange={e => setSerialInput(e.target.value)}
              label="Nowy numer seryjny"
              placeholder="Wprowadź lub zeskanuj numer seryjny"
              disabled={saving}
              autoFocus
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowScanner(true)}
              sx={{ minWidth: 0, px: 1.5, display: { xs: 'inline-flex', sm: 'none' } }}
              aria-label="Skanuj numer seryjny"
            >
              <QrCodeScanner sx={{ mr: 0.5 }} />
              Skanuj
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={handleSave}
              disabled={saving || !serialInput.trim()}
            >
              Zapisz
            </Button>
            <Button
              variant="text"
              color="inherit"
              onClick={handleCancel}
              disabled={saving}
            >
              Anuluj
            </Button>
          </Box>
          {/* MOBILE: modal */}
          <Dialog open={showModal} onClose={() => { setShowModal(false); setShowScanner(false); }} fullWidth maxWidth="xs" sx={{ display: { xs: 'block', sm: 'none' } }}>
            <DialogTitle>Uzupełnij numer seryjny</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                value={serialInput}
                onChange={e => setSerialInput(e.target.value)}
                label="Nowy numer seryjny"
                placeholder="Wprowadź lub zeskanuj numer seryjny"
                disabled={saving}
                autoFocus
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={() => setShowScanner(true)}
                startIcon={<QrCodeScanner />}
                sx={{ mb: 2 }}
                aria-label="Skanuj numer seryjny"
              >
                Skanuj
              </Button>
            </DialogContent>
            <DialogActions>
              <Button
                variant="contained"
                color="success"
                onClick={handleSave}
                disabled={saving || !serialInput.trim()}
              >
                Zapisz
              </Button>
              <Button
                variant="text"
                color="inherit"
                onClick={handleCancel}
                disabled={saving}
              >
                Anuluj
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, color: 'warning.main' }}>
            Brak numeru seryjnego
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setIsEditing(true);
              if (window.innerWidth < 600) {
                setShowModal(true);
              }
            }}
          >
            Uzupełnij
          </Button>
        </Box>
      )}

      {showScanner && (
        <BarcodeScanner
          onClose={() => {
            setShowScanner(false);
            setIsEditing(true);
          }}
          onScan={code => {
            setSerialInput(code);
            setShowScanner(false);
            setIsEditing(true);
            setShowModal(true);
            onScanComplete?.();
          }}
          title="Skanuj numer seryjny"
          subtitle="Zeskanuj kod z urządzenia"
        />
      )}
    </>
  );
};

export default SerialNumberEditor;
