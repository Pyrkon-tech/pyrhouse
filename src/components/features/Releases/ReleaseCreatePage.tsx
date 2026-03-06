import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useOrigins } from '../../../hooks/useOrigins';
import { useLocations } from '../../../hooks/useLocations';
import { getReleasesSuggestAPI, createReleaseAPI } from '../../../services/releaseService';
import { useNotification } from '../../../context/NotificationContext';
import type { SuggestedAsset, SuggestedStock } from '../../../types/release.types';

interface SelectedStock {
  stock_id: number;
  quantity: number;
  max: number;
  category_name: string | null;
  origin_label: string | null;
  location_name: string | null;
}

const ReleaseCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { origins } = useOrigins();
  const { locations, refetch: fetchLocations } = useLocations();

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const [originId, setOriginId] = useState<number | ''>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const [suggestedAssets, setSuggestedAssets] = useState<SuggestedAsset[]>([]);
  const [suggestedStocks, setSuggestedStocks] = useState<SuggestedStock[]>([]);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<number>>(new Set());
  const [selectedStocks, setSelectedStocks] = useState<Map<number, SelectedStock>>(new Map());

  const [submitting, setSubmitting] = useState(false);

  const handleSuggest = async () => {
    if (!originId) return;
    setLoadingSuggest(true);
    setSuggestError(null);
    setHasSuggestions(false);
    setSelectedAssetIds(new Set());
    setSelectedStocks(new Map());
    try {
      const data = await getReleasesSuggestAPI(originId as number, locationId || undefined);
      setSuggestedAssets(data.assets);
      setSuggestedStocks(data.stocks);
      setHasSuggestions(true);

      // Auto-select all by default
      setSelectedAssetIds(new Set(data.assets.map((a) => a.id)));
      const stockMap = new Map<number, SelectedStock>();
      data.stocks.forEach((s) => {
        stockMap.set(s.id, {
          stock_id: s.id,
          quantity: s.quantity,
          max: s.quantity,
          category_name: s.category_name,
          origin_label: s.origin_label,
          location_name: s.location_name,
        });
      });
      setSelectedStocks(stockMap);
    } catch (err: any) {
      setSuggestError(err.message || 'Błąd pobierania sugestii');
    } finally {
      setLoadingSuggest(false);
    }
  };

  const toggleAsset = (id: number) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateStockQty = (stockId: number, qty: number) => {
    setSelectedStocks((prev) => {
      const next = new Map(prev);
      const entry = next.get(stockId);
      if (!entry) return next;
      if (qty <= 0) {
        next.delete(stockId);
      } else {
        next.set(stockId, { ...entry, quantity: Math.min(qty, entry.max) });
      }
      return next;
    });
  };

  const toggleStock = (stock: SuggestedStock) => {
    setSelectedStocks((prev) => {
      const next = new Map(prev);
      if (next.has(stock.id)) {
        next.delete(stock.id);
      } else {
        next.set(stock.id, {
          stock_id: stock.id,
          quantity: stock.quantity,
          max: stock.quantity,
          category_name: stock.category_name,
          origin_label: stock.origin_label,
          location_name: stock.location_name,
        });
      }
      return next;
    });
  };

  // Select all / deselect all — assety
  const allAssetsSelected = suggestedAssets.length > 0 && selectedAssetIds.size === suggestedAssets.length;
  const someAssetsSelected = selectedAssetIds.size > 0 && selectedAssetIds.size < suggestedAssets.length;

  const toggleAllAssets = () => {
    if (allAssetsSelected) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(suggestedAssets.map((a) => a.id)));
    }
  };

  // Select all / deselect all — stocki
  const allStocksSelected = suggestedStocks.length > 0 && selectedStocks.size === suggestedStocks.length;
  const someStocksSelected = selectedStocks.size > 0 && selectedStocks.size < suggestedStocks.length;

  const toggleAllStocks = () => {
    if (allStocksSelected) {
      setSelectedStocks(new Map());
    } else {
      const stockMap = new Map<number, SelectedStock>();
      suggestedStocks.forEach((s) => {
        stockMap.set(s.id, {
          stock_id: s.id,
          quantity: s.quantity,
          max: s.quantity,
          category_name: s.category_name,
          origin_label: s.origin_label,
          location_name: s.location_name,
        });
      });
      setSelectedStocks(stockMap);
    }
  };

  const canSubmit =
    originId &&
    hasSuggestions &&
    (selectedAssetIds.size > 0 || selectedStocks.size > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const release = await createReleaseAPI({
        origin_id: originId as number,
        notes: notes.trim() || undefined,
        assets: Array.from(selectedAssetIds),
        stocks: Array.from(selectedStocks.values()).map((s) => ({
          stock_id: s.stock_id,
          quantity: s.quantity,
        })),
      });
      showSuccess(`Wydanie ${release.reference} zostało utworzone`);
      navigate(`/releases/${release.id}`);
    } catch (err: any) {
      showError(err.message || 'Błąd podczas tworzenia wydania');
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = selectedAssetIds.size + Array.from(selectedStocks.values()).reduce((s, v) => s + v.quantity, 0);

  return (
    <Box
      sx={{
        margin: '0 auto',
        padding: { xs: 2, sm: 3 },
        maxWidth: '1400px',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <IconButton onClick={() => navigate('/releases')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Nowe wydanie sprzętu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trwałe wydanie do dostawcy po zakończeniu eventu
          </Typography>
        </Box>
      </Box>

      {/* Krok 1: Parametry */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          1. Parametry wydania
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
          <FormControl size="small" required sx={{ flex: 1 }}>
            <InputLabel>Pochodzenie (origin)</InputLabel>
            <Select
              value={originId}
              label="Pochodzenie (origin)"
              onChange={(e) => {
                setOriginId(e.target.value as number);
                setHasSuggestions(false);
              }}
            >
              {origins.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Lokalizacja (opcjonalne)</InputLabel>
            <Select
              value={locationId}
              label="Lokalizacja (opcjonalne)"
              onChange={(e) => {
                setLocationId(e.target.value as number);
                setHasSuggestions(false);
              }}
            >
              <MenuItem value="">Wszystkie lokalizacje</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}{l.pavilion ? ` (${l.pavilion})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="outlined"
          startIcon={loadingSuggest ? <CircularProgress size={16} /> : <SearchIcon />}
          onClick={handleSuggest}
          disabled={!originId || loadingSuggest}
          size="small"
        >
          {loadingSuggest ? 'Pobieranie...' : 'Pobierz sugestie'}
        </Button>

        {suggestError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {suggestError}
          </Alert>
        )}
      </Paper>

      {/* Krok 2: Lista sprzętu */}
      {hasSuggestions && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            2. Wybierz sprzęt do wydania
          </Typography>

          {suggestedAssets.length === 0 && suggestedStocks.length === 0 ? (
            <Alert severity="info">Brak sprzętu do wydania dla wybranego origin/lokalizacji.</Alert>
          ) : (
            <>
              {/* Assety (seryjne) */}
              {suggestedAssets.length > 0 && (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={toggleAllAssets}
                  >
                    <Checkbox
                      checked={allAssetsSelected}
                      indeterminate={someAssetsSelected}
                      size="small"
                      sx={{ p: 0 }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Sprzęt seryjny ({selectedAssetIds.size}/{suggestedAssets.length} zaznaczonych)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                    {suggestedAssets.map((asset) => (
                      <Box
                        key={asset.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: selectedAssetIds.has(asset.id) ? 'action.selected' : 'background.default',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => toggleAsset(asset.id)}
                      >
                        <Checkbox
                          checked={selectedAssetIds.has(asset.id)}
                          size="small"
                          sx={{ p: 0 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {asset.category_name ?? '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {asset.pyr_code ?? ''}
                            {asset.item_serial ? ` · SN: ${asset.item_serial}` : ''}
                            {asset.location_name ? ` · ${asset.location_name}` : ''}
                          </Typography>
                        </Box>
                        <Chip label={asset.status} size="small" variant="outlined" />
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              {/* Stocki (nieseryjne) */}
              {suggestedStocks.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={toggleAllStocks}
                  >
                    <Checkbox
                      checked={allStocksSelected}
                      indeterminate={someStocksSelected}
                      size="small"
                      sx={{ p: 0 }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Sprzęt nieseryjny ({selectedStocks.size}/{suggestedStocks.length} zaznaczonych)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {suggestedStocks.map((stock) => {
                      const selected = selectedStocks.get(stock.id);
                      return (
                        <Box
                          key={stock.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1,
                            borderRadius: 1,
                            bgcolor: selected ? 'action.selected' : 'background.default',
                          }}
                        >
                          <Checkbox
                            checked={!!selected}
                            size="small"
                            sx={{ p: 0 }}
                            onChange={() => toggleStock(stock)}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {stock.category_name ?? '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {stock.location_name ?? ''} · dostępne: {stock.quantity}
                            </Typography>
                          </Box>
                          <Tooltip title="Ilość do wydania">
                            <TextField
                              type="number"
                              size="small"
                              value={selected?.quantity ?? 0}
                              disabled={!selected}
                              onChange={(e) => updateStockQty(stock.id, Number(e.target.value))}
                              inputProps={{ min: 1, max: stock.quantity }}
                              sx={{ width: 80 }}
                            />
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary">
                            / {stock.quantity}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </>
              )}
            </>
          )}
        </Paper>
      )}

      {/* Krok 3: Dane wydania */}
      {hasSuggestions && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            3. Dane wydania
          </Typography>

          <TextField
            label="Notatki (opcjonalne)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder="np. Zwrot po Pyrkon 2026"
          />
        </Paper>
      )}

      {/* Podsumowanie + akcje */}
      {hasSuggestions && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Wybrano:{' '}
              <strong>{selectedAssetIds.size} seryjnych</strong>
              {selectedStocks.size > 0 && (
                <> + <strong>{Array.from(selectedStocks.values()).reduce((s, v) => s + v.quantity, 0)} nieseryjnych</strong></>
              )}
              {' '}({totalItems} pozycji łącznie)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" onClick={() => navigate('/releases')}>
              Anuluj
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitting ? 'Tworzenie...' : 'Utwórz wydanie (roboczy)'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ReleaseCreatePage;
