import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import TransferPage from '../TransferPage/TransferPage';
import { useForm, FormProvider } from 'react-hook-form';
import { validatePyrCodeAPI, searchPyrCodesAPI } from '../../services/transferService';
import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock hooks
vi.mock('../../hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [
      { id: 1, name: 'Location 1' },
      { id: 2, name: 'Location 2' },
    ],
    error: null,
  }),
}));

vi.mock('../../hooks/useStocks', () => ({
  useStocks: () => ({
    stocks: [
      { id: 1, name: 'Stock 1' },
      { id: 2, name: 'Stock 2' },
    ],
    error: null,
    fetchStocks: vi.fn(),
  }),
}));

// Mock services
vi.mock('../../services/transferService', () => ({
  validatePyrCodeAPI: vi.fn(),
  searchPyrCodesAPI: vi.fn(),
  createTransferAPI: vi.fn(),
}));

const mockValidationResponse: Record<string, any> = {
  'TEST123': { id: '1', category: { label: 'Test Category' } },
  'INVALID123': new Error('Invalid PYR code'),
};

const mockSearchResponse = [
  {
    id: 1,
    pyrcode: 'TEST123',
    serial: 'SN001',
    location: { id: 1, name: 'Location 1' },
    category: { id: 1, label: 'Test Category' },
    status: 'in_stock' as const
  },
  {
    id: 2,
    pyrcode: 'TEST456',
    serial: 'SN002',
    location: { id: 1, name: 'Location 1' },
    category: { id: 1, label: 'Test Category' },
    status: 'in_stock' as const
  },
];

const Wrapper = ({ children }: { children: ReactNode }) => {
  const methods = useForm({
    defaultValues: {
      fromLocation: 1,
      toLocation: '',
      items: [{ type: 'pyr_code', id: '', pyrcode: '', quantity: 0, status: '' }],
    },
  });
  return (
    <MemoryRouter>
      <FormProvider {...methods}>{children}</FormProvider>
    </MemoryRouter>
  );
};

const renderComponent = () => {
  return render(<TransferPage />, { wrapper: Wrapper });
};

const getLastEmptyInput = () => {
  const inputs = screen.queryAllByPlaceholderText('Wpisz kod PYR');
  return inputs[inputs.length - 1];
};

const getDeleteButtonForRow = (rowIndex: number) => {
  const rows = screen.getAllByRole('row');
  const row = rows[rowIndex];
  return within(row).getByTestId('DeleteIcon');
};

describe('TransferPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(searchPyrCodesAPI).mockResolvedValue(mockSearchResponse);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('powinien dodać nowy wiersz po poprawnej walidacji kodu PYR', async () => {
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce(mockValidationResponse['TEST123']);
    renderComponent();

    const input = getLastEmptyInput();
    await act(async () => {
      fireEvent.change(input, { target: { value: 'TEST123' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(3); // header + validated row + new empty row
    });

    expect(screen.getByDisplayValue('TEST123')).toBeInTheDocument();
  });

  it('nie powinien dodać nowego wiersza po nieudanej walidacji', async () => {
    vi.mocked(validatePyrCodeAPI).mockRejectedValueOnce(mockValidationResponse['INVALID123']);
    renderComponent();

    const input = getLastEmptyInput();
    await act(async () => {
      fireEvent.change(input, { target: { value: 'INVALID123' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(2); // header + empty row
    });
  });

  it('powinien obsługiwać usuwanie wierszy', async () => {
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce(mockValidationResponse['TEST123']);
    renderComponent();

    // Dodaj wiersz
    const input = getLastEmptyInput();
    await act(async () => {
      fireEvent.change(input, { target: { value: 'TEST123' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('TEST123')).toBeInTheDocument();
    });

    // Usuń wiersz (indeks 1, bo 0 to nagłówek)
    const deleteButton = getDeleteButtonForRow(1);
    await act(async () => {
      fireEvent.click(deleteButton);
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(2); // header + empty row
      expect(screen.queryByDisplayValue('TEST123')).not.toBeInTheDocument();
    });
  });

  it('powinien walidować kod PYR po naciśnięciu Enter', async () => {
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce(mockValidationResponse['TEST123']);
    renderComponent();

    const input = getLastEmptyInput();
    await act(async () => {
      fireEvent.change(input, { target: { value: 'TEST123' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(validatePyrCodeAPI).toHaveBeenCalledWith('TEST123');
    });
  });

  it('powinien usunąć zwalidowany kod PYR z listy sugestii', async () => {
    // Przygotuj mocki
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce(mockValidationResponse['TEST123']);
    vi.mocked(searchPyrCodesAPI).mockResolvedValue(mockSearchResponse);
    
    renderComponent();

    // Dodaj pierwszy kod
    const firstInput = getLastEmptyInput();
    await act(async () => {
      fireEvent.change(firstInput, { target: { value: 'TEST123' } });
      fireEvent.keyDown(firstInput, { key: 'Enter' });
      vi.advanceTimersByTime(1000);
    });

    // Poczekaj na walidację
    await waitFor(() => {
      expect(screen.getByDisplayValue('TEST123')).toBeInTheDocument();
    });

    // Spróbuj wyszukać ten sam kod w nowym wierszu
    const newInput = getLastEmptyInput();
    await act(async () => {
      fireEvent.change(newInput, { target: { value: 'TEST' } });
      vi.advanceTimersByTime(1000);
    });

    // Sprawdź, czy kod TEST123 nie pojawia się w sugestiach
    await waitFor(() => {
      const suggestions = screen.queryAllByText('TEST123 - Test Category');
      expect(suggestions).toHaveLength(0);
    });

    // Sprawdź, czy inne sugestie są nadal widoczne
    await waitFor(() => {
      const otherSuggestions = screen.queryAllByText('TEST456 - Test Category');
      expect(otherSuggestions).toHaveLength(1);
    });
  });
}); 