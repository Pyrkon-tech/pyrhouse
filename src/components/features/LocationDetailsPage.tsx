import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Checkbox,
  Button,
  Card,
  CardContent,
  TextField,
  InputAdornment,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useLocations } from '../../hooks/useLocations';
import { TransferModal } from '../TransferPage/components/TransferModal';
import { getLocationDetails } from '../../services/locationService';
import { useTheme, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';
import { AppSnackbar } from '../ui/AppSnackbar';

// Lokalne typy dla UI komponentu
interface Asset {
  id: number;
  serial: string;
  location: Record<string, unknown>;
  category: {
    id: number;
    name: string;
    label: string;
    pyr_id: string;
    type: string;
  };
  status: 'in_stock' | 'in_transit';
  pyrcode: string;
  accessories: null | unknown[];
}

interface StockItem {
  id: number;
  category: {
    id: number;
    name: string;
    label: string;
    pyr_id: string;
    type: string;
  };
  location: Record<string, unknown>;
  quantity: number;
}

interface LocationDetailsData {
  id?: number;
  name?: string;
  details?: string | null;
  pavilion?: string | null;
  assets: Asset[] | null;
  stock_items: StockItem[] | null;
}

interface SelectedItems {
  assetIds: number[];
  stockIds: number[];
}

const LocationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationDetails, setLocationDetails] = useState<LocationDetailsData | null>(null);
  const { locations, loading: locationsLoading, error: locationsError, refetch: fetchLocations } = useLocations();
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({
    assetIds: [],
    stockIds: [],
  });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [locationName, setLocationName] = useState<string>('Szczegóły lokalizacji');
  const [locationDetailsText, setLocationDetailsText] = useState<string>('Brak szczegółów');
  const [locationPavilion, setLocationPavilion] = useState<string>('Brak pawilonu');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchQuery, setSearchQuery] = useState('');
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  const fetchLocationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Rozpoczynam pobieranie szczegółów lokalizacji dla ID:', id);
      const data = await getLocationDetails(Number(id));
      console.log('Pobrano dane lokalizacji:', data);
      // Cast API response to local type (API returns more generic structure)
      setLocationDetails(data as unknown as LocationDetailsData);
      setLocationName(data.name);
      setLocationDetailsText(data.details || 'Brak szczegółów');
      setLocationPavilion(data.pavilion || 'Brak pawilonu');
    } catch (err: any) {
      console.error('Błąd podczas pobierania szczegółów lokalizacji:', err);
      setError(err.message || 'Błąd podczas ładowania danych');
      showSnackbar('error', 'Błąd podczas ładowania danych', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationDetails();
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSelectAllAssets = () => {
    if (locationDetails?.assets) {
      const allAssetIds = locationDetails.assets.map(asset => asset.id);
      setSelectedItems(prev => ({
        ...prev,
        assetIds: prev.assetIds.length === allAssetIds.length ? [] : allAssetIds,
      }));
    }
  };

  const handleSelectAllStocks = () => {
    if (locationDetails?.stock_items) {
      const allStockIds = locationDetails.stock_items.map(item => item.id);
      setSelectedItems(prev => ({
        ...prev,
        stockIds: prev.stockIds.length === allStockIds.length ? [] : allStockIds,
      }));
    }
  };

  const handleSelectAsset = (assetId: number) => {
    setSelectedItems(prev => ({
      ...prev,
      assetIds: prev.assetIds.includes(assetId)
        ? prev.assetIds.filter(id => id !== assetId)
        : [...prev.assetIds, assetId],
    }));
  };

  const handleSelectStock = (stockId: number) => {
    setSelectedItems(prev => ({
      ...prev,
      stockIds: prev.stockIds.includes(stockId)
        ? prev.stockIds.filter(id => id !== stockId)
        : [...prev.stockIds, stockId],
    }));
  };

  const handleTransferSuccess = () => {
    setSelectedItems({ assetIds: [], stockIds: [] });
    // Odśwież dane lokalizacji
    if (id) {
      fetchLocationDetails();
    }
  };

  // Dodajemy funkcję tłumaczącą statusy
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_stock':
      case 'available':
        return 'Na Stanie';
      case 'in_transit':
        return 'W trasie';
      case 'located':
        return 'W lokacji';
      default:
        return status;
    }
  };

  // Dodajemy funkcję zwracającą kolor dla statusu
  const getStatusColor = (status: string): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'in_stock':
      case 'available':
        return 'success';
      case 'in_transit':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Dodajemy nową funkcję do filtrowania elementów
  const filterItems = (items: any[], query: string) => {
    if (!query) return items;
    return items.filter((item) => {
      const searchableFields = [
        item.id.toString(),
        item.category?.name,
        item.category?.label,
        'pyrcode' in item ? item.pyrcode : '',
        'serial' in item ? item.serial : '',
      ];
      return searchableFields.some(field => 
        field?.toLowerCase().includes(query.toLowerCase())
      );
    });
  };

  const getSelectedBgColor = () => {
    return theme.palette.mode === 'dark' ? 'action.selected' : 'primary.lighter';
  };

  // Modyfikujemy renderowanie tabeli desktop
  const renderDesktopTable = (items: Asset[] | StockItem[], type: 'asset' | 'stock') => {
    const isAsset = type === 'asset';
    const selectedIds = isAsset ? selectedItems.assetIds : selectedItems.stockIds;
    const handleSelectAll = isAsset ? handleSelectAllAssets : handleSelectAllStocks;
    const handleSelect = isAsset ? handleSelectAsset : handleSelectStock;
    const filteredItems = filterItems(items, searchQuery);

    return (
      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          mb: 4,
          '& .MuiTableCell-root': {
            borderColor: 'divider',
          },
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ 
              backgroundColor: 'primary.light',
            }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < filteredItems.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText', py: 2 }}>
                <Typography component="div" sx={{ fontWeight: 600 }}>ID</Typography>
              </TableCell>
              {isAsset ? (
                <>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText', py: 2 }}>
                    <Typography component="div" sx={{ fontWeight: 600 }}>Typ</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText', py: 2 }}>
                    <Typography component="div" sx={{ fontWeight: 600 }}>Status</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText', py: 2 }}>
                    <Typography component="div" sx={{ fontWeight: 600 }}>PYR Code</Typography>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText', py: 2 }}>
                    <Typography component="div" sx={{ fontWeight: 600 }}>Kategoria</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.contrastText', py: 2 }}>
                    <Typography component="div" sx={{ fontWeight: 600 }}>Ilość</Typography>
                  </TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAsset ? 5 : 4} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nie znaleziono elementów
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  sx={{
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    bgcolor: selectedIds.includes(item.id) ? getSelectedBgColor() : 'transparent',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleSelect(item.id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography component="div" sx={{ fontWeight: 500 }}>
                      {item.id}
                    </Typography>
                  </TableCell>
                  {isAsset ? (
                    <>
                      <TableCell>
                        <Typography component="div">
                          {(item as Asset).category.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography component="div">
                          {getStatusLabel((item as Asset).status)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography component="div">
                          {(item as Asset).pyrcode || '-'}
                        </Typography>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Typography component="div">
                          {(item as StockItem).category.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography component="div">
                          {(item as StockItem).quantity}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Modyfikujemy renderowanie karty mobilnej
  const renderMobileCard = (item: Asset | StockItem, type: 'asset' | 'stock') => {
    const isAsset = type === 'asset';
    const isSelected = isAsset 
      ? selectedItems.assetIds.includes((item as Asset).id)
      : selectedItems.stockIds.includes((item as StockItem).id);

    return (
      <Card 
        key={item.id} 
        sx={{ 
          mb: 2, 
          position: 'relative',
          borderRadius: 2,
          bgcolor: isSelected ? getSelectedBgColor() : 'transparent',
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-2px)',
            transition: 'all 0.2s'
          },
          cursor: 'pointer',
        }}
        onClick={() => {
          if (isAsset) {
            handleSelectAsset((item as Asset).id);
          } else {
            handleSelectStock((item as StockItem).id);
          }
        }}
      >
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Checkbox
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => {
              if (isAsset) {
                handleSelectAsset((item as Asset).id);
              } else {
                handleSelectStock((item as StockItem).id);
              }
            }}
          />
        </Box>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            {isAsset ? (item as Asset).category.label : (item as StockItem).category.label}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              ID: <Typography component="span" color="text.primary">{item.id}</Typography>
            </Typography>
            {isAsset ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Status: <Chip 
                    size="small" 
                    label={getStatusLabel((item as Asset).status)}
                    color={getStatusColor((item as Asset).status)}
                  />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PYR Code: <Typography component="span" color="text.primary">{(item as Asset).pyrcode || '-'}</Typography>
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Ilość: <Typography component="span" color="text.primary">{(item as StockItem).quantity}</Typography>
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Błąd podczas ładowania danych
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => fetchLocationDetails()}
          >
            Spróbuj ponownie
          </Button>
        </Box>
        <AppSnackbar
          open={snackbar.open}
          type={snackbar.type}
          message={snackbar.message}
          details={snackbar.details}
          onClose={closeSnackbar}
          autoHideDuration={snackbar.autoHideDuration}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: { xs: 8, sm: 6 } }}>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
      {/* Nagłówek strony */}
      <Box 
        sx={{ 
          mb: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2
        }}
      >
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 600,
              color: 'primary.main',
              mb: 1
            }}
          >
            {locationName}
          </Typography>
        </Box>
      </Box>

      {/* Informacje o lokalizacji */}
      <Box 
        sx={{ 
          mb: 4, 
          p: { xs: 2, sm: 3 }, 
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'white', 
          borderRadius: 2, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Nagłówek sekcji */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: 1, 
              border: '1px solid',
              borderColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <InfoIcon color="primary" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Informacje o lokalizacji
            </Typography>
          </Box>

          {/* Główne informacje */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 3 
          }}>
            {/* Lewa kolumna */}
            <Box sx={{ 
              p: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Identyfikator
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    #{id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Nazwa lokalizacji
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {locationName}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Prawa kolumna */}
            <Box sx={{ 
              p: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Pawilon
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: locationPavilion === 'Brak pawilonu' ? 'text.secondary' : 'text.primary',
                    fontStyle: locationPavilion === 'Brak pawilonu' ? 'italic' : 'normal'
                  }}
                >
                  {locationPavilion}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Szczegóły
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: locationDetailsText === 'Brak szczegółów' ? 'text.secondary' : 'text.primary',
                    fontStyle: locationDetailsText === 'Brak szczegółów' ? 'italic' : 'normal'
                  }}
                >
                  {locationDetailsText}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Statystyki */}
          <Box sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mt: 1
          }}>
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Liczba sprzętu
                </Typography>
              </Box>
              <Chip
                label={locationDetails?.assets?.length || 0}
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Liczba zasobów
                </Typography>
              </Box>
              <Chip
                label={locationDetails?.stock_items?.length || 0}
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Sprzęt i Zasoby w zakładkach */}
      <Box sx={{ mt: 4 }}>
        {locationDetails?.assets && locationDetails.assets.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'primary.main',
                '&::after': {
                  content: '""',
                  flex: 1,
                  height: '1px',
                  bgcolor: 'divider',
                  ml: 2
                }
              }}
            >
              Sprzęt
              <Chip 
                label={filterItems(locationDetails.assets, searchQuery).length}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            </Typography>
            
            {/* Wyszukiwarka i odświeżanie */}
            <Box 
              sx={{ 
                display: 'flex', 
                gap: 2,
                mb: 2,
                mt: 2
              }}
            >
              <TextField
                placeholder="Szukaj..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ 
                  flexGrow: 1,
                  maxWidth: 300
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                color="primary"
                onClick={() => fetchLocationDetails()}
                startIcon={<RefreshIcon />}
                sx={{ 
                  whiteSpace: 'nowrap'
                }}
              >
                Odśwież
              </Button>
            </Box>

            {isMobile ? (
              filterItems(locationDetails.assets, searchQuery).map(asset => renderMobileCard(asset, 'asset'))
            ) : (
              renderDesktopTable(locationDetails.assets, 'asset')
            )}
          </Box>
        )}

        {locationDetails?.stock_items && locationDetails.stock_items.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'primary.main',
                '&::after': {
                  content: '""',
                  flex: 1,
                  height: '1px',
                  bgcolor: 'divider',
                  ml: 2
                }
              }}
            >
              Zasoby
              <Chip 
                label={filterItems(locationDetails.stock_items, searchQuery).length}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            </Typography>
            {isMobile ? (
              filterItems(locationDetails.stock_items, searchQuery).map(item => renderMobileCard(item, 'stock'))
            ) : (
              renderDesktopTable(locationDetails.stock_items, 'stock')
            )}
          </Box>
        )}
      </Box>

      {/* Zaznaczone elementy - sticky footer */}
      {(selectedItems.assetIds.length > 0 || selectedItems.stockIds.length > 0) && (
        <Box 
          sx={{ 
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'white',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
            p: 2,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid',
            borderColor: 'divider',
            transform: 'translateY(0)',
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(0)',
            },
            '@media (max-width: 600px)': {
              flexDirection: 'column',
              gap: 2,
              p: 3,
            }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'center',
            flexWrap: 'wrap',
            '@media (max-width: 600px)': {
              width: '100%',
              justifyContent: 'center'
            }
          }}>
            <Typography variant="subtitle1">
              Zaznaczone elementy:
            </Typography>
            {selectedItems.assetIds.length > 0 && (
              <Chip 
                label={`Sprzęt: ${selectedItems.assetIds.length}`}
                color="primary"
                sx={{ fontWeight: 500 }}
              />
            )}
            {selectedItems.stockIds.length > 0 && (
              <Chip 
                label={`Zasoby: ${selectedItems.stockIds.length}`}
                color="primary"
                sx={{ fontWeight: 500 }}
              />
            )}
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setTransferModalOpen(true)}
            startIcon={<AddIcon />}
            sx={{ 
              minWidth: 200,
              borderRadius: 2,
              py: 1.5,
              '@media (max-width: 600px)': {
                width: '100%'
              }
            }}
          >
            Utwórz transfer
          </Button>
        </Box>
      )}

      {/* Modal transferu */}
      <TransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={handleTransferSuccess}
        selectedAssets={selectedItems.assetIds}
        selectedStocks={selectedItems.stockIds}
        fromLocationId={Number(id)}
        locations={locations}
        stockItems={locationDetails?.stock_items || []}
        locationsLoading={locationsLoading}
        locationsError={locationsError}
      />
    </Container>
  );
};

export default LocationDetailsPage; 