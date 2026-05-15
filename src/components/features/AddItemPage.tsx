import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  Button,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AddAssetForm } from './AddAssetForm';
import { AddStockForm } from './AddStockForm';
import { BulkAddAssetForm } from './BulkAddAssetForm';
import { AddAssetWithoutSerialForm } from './AddAssetWithoutSerialForm';
import { MassDeliveryForm } from './MassDeliveryForm';
import { ClaimForm } from './ClaimForm';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { useCategories } from '../../hooks/useCategories';
import LazyIcon from '../ui/LazyIcon';

const Laptop = lazy(() => import('@mui/icons-material/Laptop'));
const Inventory = lazy(() => import('@mui/icons-material/Inventory'));
const LocalShipping = lazy(() => import('@mui/icons-material/LocalShipping'));
const RefreshIcon = lazy(() => import('@mui/icons-material/Refresh'));
const ConfirmationNumberIcon = lazy(() => import('@mui/icons-material/ConfirmationNumber'));

const AddItemPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [addMode, setAddMode] = useState<'single' | 'bulk' | 'noSerial'>('single');
  const [massMode, setMassMode] = useState<'reserve' | 'claim'>('reserve');
  const { categories, error, loading, refreshCategories } = useCategories();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  useEffect(() => {
    if (error) showSnackbar('error', error, undefined, null);
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
        <Button
          component={RouterLink}
          to="/reservations"
          size="small"
          variant="outlined"
          startIcon={<Suspense fallback={null}><ConfirmationNumberIcon fontSize="small" /></Suspense>}
          sx={{ ml: 'auto', mb: 0.5 }}
        >
          Rezerwacje PYR
        </Button>
      </Box>

      <Tabs value={currentTab} onChange={(_e, v) => setCurrentTab(v)} sx={{ mt: 2 }}>
        <Tab
          icon={<LazyIcon><Suspense fallback={null}><Laptop /></Suspense></LazyIcon>}
          label="Sprzęt z kodem PYR"
        />
        <Tab
          icon={<LazyIcon><Suspense fallback={null}><Inventory /></Suspense></LazyIcon>}
          label="Zasoby magazynowe"
        />
        <Tab
          icon={<LazyIcon><Suspense fallback={null}><LocalShipping /></Suspense></LazyIcon>}
          label="Masowa dostawa"
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

      {/* Tab 0 — Sprzęt z kodem PYR */}
      {currentTab === 0 && (
        <Paper sx={{ mt: 1, p: { xs: 2, sm: 2 } }}>
          <Box sx={{ mb: 3 }}>
            <ToggleButtonGroup
              value={addMode}
              exclusive
              onChange={(_e, newMode) => { if (newMode !== null) setAddMode(newMode); }}
              sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, width: { xs: '100%', sm: 'auto' } }}
            >
              <ToggleButton value="single" sx={{ flex: { xs: 1, sm: 'unset' } }}>
                Pojedynczy
              </ToggleButton>
              <ToggleButton value="bulk" sx={{ flex: { xs: 1, sm: 'unset' } }}>
                Grupowy
              </ToggleButton>
              <ToggleButton value="noSerial" sx={{ flex: { xs: 1, sm: 'unset' } }}>
                Wybuchło - bez numeru seryjnego
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {addMode === 'single' && <AddAssetForm categories={categories} loading={loading} />}
          {addMode === 'bulk' && <BulkAddAssetForm categories={categories} />}
          {addMode === 'noSerial' && <AddAssetWithoutSerialForm categories={categories} />}
        </Paper>
      )}

      {/* Tab 1 — Zasoby magazynowe */}
      {currentTab === 1 && (
        <Paper sx={{ mt: 3, p: { xs: 2, sm: 3 } }}>
          <AddStockForm categories={categories} loading={loading} />
        </Paper>
      )}

      {/* Tab 2 — Masowa dostawa */}
      {currentTab === 2 && (
        <Paper sx={{ mt: 1, p: { xs: 2, sm: 2 } }}>
          <Box sx={{ mb: 3 }}>
            <ToggleButtonGroup
              value={massMode}
              exclusive
              onChange={(_e, v) => { if (v !== null) setMassMode(v); }}
              sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, width: { xs: '100%', sm: 'auto' } }}
            >
              <ToggleButton value="reserve" sx={{ flex: { xs: 1, sm: 'unset' } }}>
                Zarezerwuj kody
              </ToggleButton>
              <ToggleButton value="claim" sx={{ flex: { xs: 1, sm: 'unset' } }}>
                Realizuj rezerwacje
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {massMode === 'reserve' && <MassDeliveryForm categories={categories} />}
          {massMode === 'claim' && <ClaimForm />}
        </Paper>
      )}
    </Container>
  );
};

export default AddItemPage;
