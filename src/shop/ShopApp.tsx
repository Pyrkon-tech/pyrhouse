import React, { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ShopSessionProvider, useShopSession } from './ShopSession';
import { CartProvider } from './Cart';
import { CatalogProvider } from './Catalog';
import ShopLayout from './ShopLayout';
import LoginPage from './pages/LoginPage';
import InvitePage from './pages/InvitePage';
import CallbackPage from './pages/CallbackPage';

const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));

const Loader = () => (
  <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress />
  </Box>
);

/** Everything behind the shop login. */
const RequireAccount: React.FC = () => {
  const { account, loading } = useShopSession();
  if (loading) return <Loader />;
  if (!account) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const ShopApp: React.FC = () => (
  <BrowserRouter>
    <ShopSessionProvider>
      <CatalogProvider>
        <CartProvider>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              <Route path="/auth/google/callback" element={<CallbackPage />} />
              <Route element={<RequireAccount />}>
                <Route element={<ShopLayout />}>
                  <Route index element={<CatalogPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </CartProvider>
      </CatalogProvider>
    </ShopSessionProvider>
  </BrowserRouter>
);

export default ShopApp;
