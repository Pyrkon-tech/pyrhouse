import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Container, Typography, Tabs, Tab, Box, Paper, ButtonGroup, Button, Tooltip, IconButton } from '@mui/material';
import { AddAssetForm } from './AddAssetForm';
import { AddStockForm } from './AddStockForm';
import { BulkAddAssetForm } from './BulkAddAssetForm';
import { AddAssetWithoutSerialForm } from './AddAssetWithoutSerialForm';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { useCategories } from '../../hooks/useCategories';
import LazyIcon from '../ui/LazyIcon';

const Laptop = lazy(() => import('@mui/icons-material/Laptop'));
const Inventory = lazy(() => import('@mui/icons-material/Inventory'));
const RefreshIcon = lazy(() => import('@mui/icons-material/Refresh'));

const AddItemPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0); // 0 = "Wartościowe", 1 = "Zasoby"
  const [addMode, setAddMode] = useState<'single' | 'bulk' | 'noSerial'>('single');
  const { categories, error, loading, refreshCategories } = useCategories();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  // Wyświetl snackbar tylko raz, gdy pojawi się error
  useEffect(() => {
    if (error) {
      showSnackbar('error', error, undefined, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <Container>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" gutterBottom>
          Dodaj Przedmiot
        </Typography>
        <Tooltip title="Odśwież kategorie">
          <span>
            <IconButton size="small" onClick={() => refreshCategories(true)} disabled={loading} sx={{ mb: 0.5 }}>
              <Suspense fallback={null}><RefreshIcon fontSize="small" /></Suspense>
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Tabs value={currentTab} onChange={(_e,newValue) => setCurrentTab(newValue)} sx={{ mt: 2 }}>
        <Tab 
          icon={<LazyIcon><Suspense fallback={null}><Laptop /></Suspense></LazyIcon>} 
          label={<Box>Sprzęt z kodem PYR</Box>} 
        />
        <Tab 
          icon={<LazyIcon><Suspense fallback={null}><Inventory /></Suspense></LazyIcon>} 
          label={<Box>Zasoby magazynowe</Box>} 
        />
      </Tabs>

      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />

      {currentTab === 0 && (
        <Paper sx={{ mt: 1, p: { xs: 2, sm: 2 } }}>
          <Box sx={{ mb: 3 }}>
            <ButtonGroup
              variant="contained"
              aria-label="outlined primary button group"
              orientation="vertical"
              sx={{
                width: '100%',
                '@media (min-width: 600px)': {
                  width: 'auto',
                  flexDirection: 'row',
                }
              }}
            >
              <Button
                onClick={() => setAddMode('single')}
                variant={addMode === 'single' ? 'contained' : 'outlined'}
                sx={{
                  width: '100%',
                  '@media (min-width: 600px)': {
                    width: 'auto',
                  }
                }}
              >
                Pojedynczy
              </Button>
              <Button
                onClick={() => setAddMode('bulk')}
                variant={addMode === 'bulk' ? 'contained' : 'outlined'}
                sx={{
                  width: '100%',
                  '@media (min-width: 600px)': {
                    width: 'auto',
                  }
                }}
              >
                Grupowy
              </Button>
              <Button
                onClick={() => setAddMode('noSerial')}
                variant={addMode === 'noSerial' ? 'contained' : 'outlined'}
                sx={{
                  width: '100%',
                  '@media (min-width: 600px)': {
                    width: 'auto',
                  }
                }}
              >
                Wybuchło - bez numeru seryjnego
              </Button>
            </ButtonGroup>
          </Box>
          {addMode === 'single' && <AddAssetForm categories={categories} loading={loading} />}
          {addMode === 'bulk' && <BulkAddAssetForm categories={categories} />}
          {addMode === 'noSerial' && <AddAssetWithoutSerialForm categories={categories} />}
        </Paper>
      )}
      {currentTab === 1 && (
        <Paper sx={{ mt: 3, p: { xs: 2, sm: 3 } }}>
          <AddStockForm categories={categories} loading={loading} />
        </Paper>
      )}
    </Container>
  );
};

export default AddItemPage;
