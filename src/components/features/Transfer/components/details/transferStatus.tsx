import { lazy, Suspense } from 'react';

const LocalShippingIcon = lazy(() => import('@mui/icons-material/LocalShipping'));
const CheckCircleIcon = lazy(() => import('@mui/icons-material/CheckCircle'));
const UTurnLeftIcon = lazy(() => import('@mui/icons-material/UTurnLeft'));
const ErrorIcon = lazy(() => import('@mui/icons-material/Error'));

export const statusTranslations: { [key: string]: string } = {
  'created': 'Utworzony',
  'in_transit': 'W drodze',
  'delivered': 'Dostarczony',
  'cancelled': 'Anulowany',
  'completed': 'Dostarczony'
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'in_transit':
      return <Suspense fallback={null}><LocalShippingIcon /></Suspense>;
    case 'delivered':
    case 'available':
    case 'completed':
    case 'located':
      return <Suspense fallback={null}><CheckCircleIcon /></Suspense>;
    case 'returned':
      return <Suspense fallback={null}><UTurnLeftIcon /></Suspense>;
    default:
      return <Suspense fallback={null}><ErrorIcon /></Suspense>;
  }
};

export const statusChipColor = (status: string): 'success' | 'warning' | 'error' | 'default' =>
  status === 'completed' ? 'success'
    : status === 'in_transit' ? 'warning'
    : status === 'cancelled' ? 'error'
    : 'default';
