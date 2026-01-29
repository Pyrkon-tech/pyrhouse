import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import PrivateRoute from './components/features/Authorisation';
import Layout from './components/layout/Layout';
import LoadingSkeleton from './components/ui/LoadingSkeleton';
import { ThemeProvider } from './theme/ThemeContext';
import { publicRoutes, protectedRoutes, adminRoutes } from './routes/routes';
import RequireRole from './components/features/RequireRole';

// Konfiguracja flag React Router v7
const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true
};

// Komponent dla chronionych tras
const ProtectedRouteWrapper = () => (
  <PrivateRoute>
    <Layout>
      <Outlet />
    </Layout>
  </PrivateRoute>
);

// Komponent dla tras z wymaganą rolą
const RoleProtectedRoute = ({
  children,
  requiredRoles
}: {
  children: React.ReactNode;
  requiredRoles: ('admin' | 'moderator')[];
}) => (
  <RequireRole allowed={requiredRoles}>
    {children}
  </RequireRole>
);

// Komponent dla pojedynczej trasy z obsługą błędów
const RouteWithErrorBoundary = ({ 
  component: Component 
}: { 
  component: React.ComponentType<any>;
}) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingSkeleton />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <Router future={routerFutureConfig}>
        <Routes>
          {/* Publiczne trasy */}
          {publicRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                route.component ? (
                  <RouteWithErrorBoundary component={route.component} />
                ) : (
                  <Navigate to={route.redirect!} replace />
                )
              }
            />
          ))}

          {/* Chronione trasy */}
          <Route path="/" element={<ProtectedRouteWrapper />}>
            {protectedRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  route.redirect ? (
                    <Navigate to={route.redirect} replace />
                  ) : route.component ? (
                    <RouteWithErrorBoundary component={route.component} />
                  ) : null
                }
              />
            ))}

            {/* Trasy administracyjne */}
            {adminRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  route.requiredRoles ? (
                    <RoleProtectedRoute requiredRoles={route.requiredRoles}>
                      <RouteWithErrorBoundary component={route.component!} />
                    </RoleProtectedRoute>
                  ) : (
                    <RouteWithErrorBoundary component={route.component!} />
                  )
                }
              />
            ))}
          </Route>

          {/* Fallback dla nieznanych tras */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
