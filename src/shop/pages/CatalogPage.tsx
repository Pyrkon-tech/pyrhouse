import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useCart } from '../Cart';
import { useCatalog } from '../Catalog';
import { useShopSession } from '../ShopSession';
import QuantityStepper from '../QuantityStepper';
import { fmtDateTime, fmtMoney } from '../../utils/shopFormat';
import type { ShopProduct } from '../../types/shop.types';

const ALL = '__all__';

const ProductCard: React.FC<{ product: ShopProduct; showPrices: boolean; canOrder: boolean }> = ({ product, showPrices, canOrder }) => {
  const { quantityOf, setQuantity } = useCart();
  const inCart = quantityOf(product.id);
  const [qty, setQty] = useState(1);
  const shown = inCart || qty;

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', borderColor: inCart ? 'rgba(255,152,0,0.5)' : 'divider', borderWidth: 1, borderStyle: 'solid' }}>
      {product.image_url ? (
        <CardMedia component="img" image={product.image_url} alt="" sx={{ height: 112, objectFit: 'cover' }} />
      ) : (
        <Box sx={{ height: 112, bgcolor: '#1f2747', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Inventory2OutlinedIcon sx={{ fontSize: 52, color: 'primary.light' }} />
        </Box>
      )}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1 }}>
        {product.section && <Chip label={product.section} size="small" sx={{ alignSelf: 'flex-start' }} />}
        <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>{product.name}</Typography>
        {product.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>{product.description}</Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 'auto' }}>
          {showPrices && product.price != null && <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{fmtMoney(product.price)}</Typography>}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {showPrices && product.price != null ? '/ szt.' : ''}
            {product.max_per_order ? ` · maks. ${product.max_per_order}` : ''}
          </Typography>
        </Box>
        {canOrder && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <QuantityStepper
              label={product.name}
              value={shown}
              min={inCart ? 0 : 1}
              max={product.max_per_order}
              onChange={(q) => (inCart ? setQuantity(product.id, q) : setQty(Math.max(1, q)))}
            />
            {inCart ? (
              <Chip label="W koszyku ✓" color="primary" variant="outlined" sx={{ ml: 'auto' }} />
            ) : (
              <Button variant="contained" onClick={() => setQuantity(product.id, qty)} sx={{ ml: 'auto' }}>Dodaj</Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const CatalogPage: React.FC = () => {
  const { products, loading, error } = useCatalog();
  const { config } = useShopSession();
  const [section, setSection] = useState(ALL);
  const [query, setQuery] = useState('');
  const showPrices = !!config?.show_prices;
  const canOrder = !!config?.orders_open;

  const sections = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => counts.set(p.section || 'Inne', (counts.get(p.section || 'Inne') ?? 0) + 1));
    return [...counts.entries()];
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      (section === ALL || (p.section || 'Inne') === section) &&
      (!q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)),
    );
  }, [products, section, query]);

  return (
    <Box sx={{ display: 'flex', gap: 3.5, flexDirection: { xs: 'column', md: 'row' } }}>
      <Box component="aside" sx={{ width: { md: 240 }, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box component="nav" aria-label="Sekcje katalogu">
          <Typography variant="overline" sx={{ color: 'text.secondary', px: 1.5 }}>Sekcje</Typography>
          <List dense disablePadding sx={{ display: { xs: 'flex', md: 'block' }, overflowX: 'auto', gap: 0.5 }}>
            {[[ALL, products.length] as const, ...sections].map(([name, count]) => (
              <ListItemButton
                key={name}
                selected={section === name}
                onClick={() => setSection(name)}
                sx={{ borderRadius: '10px', flex: 'none', '&.Mui-selected': { bgcolor: 'rgba(255,152,0,0.16)', color: 'primary.light' } }}
              >
                <ListItemText primary={name === ALL ? 'Wszystko' : name} />
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>{count}</Typography>
              </ListItemButton>
            ))}
          </List>
        </Box>
        {config && (
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', fontWeight: 500 }}>
              <ScheduleIcon fontSize="small" sx={{ color: 'primary.light' }} />
              {canOrder ? 'Zamówienia otwarte' : 'Zamówienia zamknięte'}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {canOrder
                ? config.orders_open_until
                  ? `Przyjmujemy do ${fmtDateTime(config.orders_open_until)}.`
                  : 'Przyjmujemy zamówienia.'
                : 'Możesz przeglądać katalog i swoje zamówienia. W pilnej sprawie napisz do koordynatora.'}
            </Typography>
          </Paper>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography component="h1" sx={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 32 }}>Katalog sprzętu</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {products.length} pozycji{showPrices ? ' · ceny za sztukę na cały termin wypożyczenia' : ''}
            </Typography>
          </Box>
          <TextField
            type="search"
            size="small"
            placeholder="Szukaj: telewizor, mikrofon…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 320 } }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
              htmlInput: { 'aria-label': 'Szukaj w katalogu' },
            }}
          />
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {loading
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} variant="rounded" height={300} />)
            : visible.map((p) => <ProductCard key={p.id} product={p} showPrices={showPrices} canOrder={canOrder} />)}
        </Box>
        {!loading && visible.length === 0 && (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
            {products.length === 0 ? 'Katalog jest jeszcze pusty.' : 'Nic nie pasuje do wyszukiwania.'}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default CatalogPage;
