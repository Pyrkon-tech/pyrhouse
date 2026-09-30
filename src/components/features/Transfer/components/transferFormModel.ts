// Shared model for the transfer form (TransferFormCore + its subcomponents)

import type { Asset } from '../../../../types/asset.types';

export interface TransferFormUser {
  id: number;
  username: string;
  fullname: string | null;
}

/** A PYR code search hit (GET /locations/{id}/search) */
export type FormPyrCodeSuggestion = Asset;

export type FormValidationStatus = 'success' | 'failure' | '';

export interface FormStock {
  id: number;
  category: {
    id: number;
    label: string;
    type: string;
  };
  origin: string;
  quantity: number;
  location: {
    id: number;
    name: string;
  };
}

export interface FormItem {
  type: 'pyr_code' | 'stock';
  id: string;
  pyrcode: string;
  quantity: number;
  status: FormValidationStatus;
  category?: {
    label: string;
  };
}

export interface TransferFormValues {
  fromLocation: number;
  toLocation: string;
  items: FormItem[];
  users: TransferFormUser[];
}

const ERROR_MESSAGES: { [key: string]: string } = {
  'Invalid transfer data': 'Nieprawidłowe dane transferu',
  'Unauthorized access': 'Brak autoryzacji',
  'Access forbidden': 'Dostęp zabroniony',
  'Resource not found': 'Nie znaleziono zasobu',
  'Server error occurred': 'Wystąpił błąd serwera',
  'Request timeout': 'Przekroczono limit czasu żądania',
  'An unexpected error occurred': 'Wystąpił nieoczekiwany błąd',
  'Transfer from and to location cannot be the same': 'Lokalizacja źródłowa i docelowa nie mogą być takie same',
};

export const getTransferErrorMessage = (error: string): string =>
  ERROR_MESSAGES[error] || 'Wystąpił błąd podczas przetwarzania transferu';
