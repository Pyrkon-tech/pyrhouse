import React from 'react';
import { Box, Button, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useCart } from './Cart';
import { useCatalog } from './Catalog';
import { useShopSession } from './ShopSession';
import QuantityStepper from './QuantityStepper';
import { fmtMoney } from '../utils/shopFormat';

const CartDrawer: React.FC = () => {
  const { lines, open, setOpen, setQuantity } = useCart();
  const { byId } = useCatalog();
  const { config } = useShopSession();
  const navigate = useNavigate();
  const showPrices = !!config?.show_prices;

  // Products that left the catalog (deactivated) are not orderable; show only what can be ordered.
  const rows = lines.flatMap((l) => {
    const p = byId.get(l.productId);
    return p ? [{ line: l, product: p }] : [];
  });
  const total = rows.reduce((s, r) => s + (r.product.price ?? 0) * r.line.quantity, 0);

  return (
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 }, display: 'flex', flexDirection: 'column' } } }}>
      <Box sx={{ height: 72, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontFamily: 'Cinzel, serif' }}>
          Koszyk{' '}
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>· {rows.length} {rows.length === 1 ? 'pozycja' : 'pozycje'}</Typography>
        </Typography>
        <IconButton onClick={() => setOpen(false)} aria-label="Zamknij koszyk"><CloseIcon /></IconButton>
      </Box>

      <Box component="ul" sx={{ listStyle: 'none', m: 0, px: 3, py: 1, flexGrow: 1, overflowY: 'auto' }}>
        {rows.length === 0 && (
          <Typography sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>Koszyk jest pusty.</Typography>
        )}
        {rows.map(({ line, product }) => (
          <Box component="li" key={product.id} sx={{ py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 500 }}>{product.name}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {showPrices && product.price != null ? `${fmtMoney(product.price)} / szt.` : ''}
                  {product.max_per_order ? `${showPrices && product.price != null ? ' · ' : ''}maks. ${product.max_per_order}` : ''}
                </Typography>
              </Box>
              {showPrices && product.price != null && (
                <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtMoney(product.price * line.quantity)}</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <QuantityStepper size="small" label={product.name} value={line.quantity} min={1} max={product.max_per_order}
                onChange={(q) => setQuantity(product.id, q)} />
              <Button color="error" size="small" startIcon={<DeleteOutlineIcon />} onClick={() => setQuantity(product.id, 0)} sx={{ ml: 'auto' }}>
                Usuń
              </Button>
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        {showPrices && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography sx={{ color: 'text.secondary' }}>Razem</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{fmtMoney(total)}</Typography>
          </Box>
        )}
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Koszyk zapisuje się na tym urządzeniu. Salę i termin wybierzesz w następnym kroku.
        </Typography>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          disabled={rows.length === 0}
          onClick={() => { setOpen(false); navigate('/checkout'); }}
          sx={{ height: 48 }}
        >
          Przejdź do zamówienia
        </Button>
      </Box>
    </Drawer>
  );
};

export default CartDrawer;
