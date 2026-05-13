import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import TransferFormCore from '../features/Transfer/components/TransferFormCore';
import { useForm, FormProvider } from 'react-hook-form';
import { validatePyrCodeAPI, searchPyrCodesAPI } from '../../services/transferService';
import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/userService', () => ({
  getUsersAPI: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/questService', () => ({
  createTransferFromQuestAPI: vi.fn(),
}));

// Mock hooks
vi.mock('../../hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [
      { id: 1, name: 'Location 1' },
      { id: 2, name: 'Location 2' },
    ],
    error: null,
    refetch: vi.fn(),
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

const mockValidationOk = {
  id: 1,
  pyrcode: 'TEST123',
  serial: 'SN001',
  category: { id: 1, label: 'Test Category' },
  location: { id: 1, name: 'Location 1', lat: 0, lng: 0, pavilion: null },
  status: 'available' as const,
  is_valid: true,
};

const mockSearchResponse = [
  {
    id: 1,
    pyrcode: 'TEST123',
    serial: 'SN001',
    location: { id: 1, name: 'Location 1' },
    category: { id: 1, label: 'Test Category' },
    status: 'available' as const
  },
  {
    id: 2,
    pyrcode: 'TEST456',
    serial: 'SN002',
    location: { id: 1, name: 'Location 1' },
    category: { id: 1, label: 'Test Category' },
    status: 'available' as const
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
  return render(<TransferFormCore />, { wrapper: Wrapper });
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
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce(mockValidationOk);
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
    vi.mocked(validatePyrCodeAPI).mockRejectedValueOnce(new Error('Invalid PYR code'));
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
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce(mockValidationOk);
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
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce(mockValidationOk);
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

  it('skaner: Enter z krótkim kodem (< 2 znaki) nie wywołuje walidacji', async () => {
    renderComponent();
    const input = getLastEmptyInput();

    await act(async () => {
      fireEvent.change(input, { target: { value: 'P' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      vi.advanceTimersByTime(500);
    });

    expect(validatePyrCodeAPI).not.toHaveBeenCalled();
  });

  it('skaner: Enter z pełnym kodem waliduje dokładnie ten kod (nie inny)', async () => {
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce({ ...mockValidationOk, pyrcode: 'PYR-LAP24' });
    renderComponent();
    const input = getLastEmptyInput();

    await act(async () => {
      fireEvent.change(input, { target: { value: 'PYR-LAP24' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(validatePyrCodeAPI).toHaveBeenCalledTimes(1);
      expect(validatePyrCodeAPI).toHaveBeenCalledWith('PYR-LAP24');
    });
  });

  it('skaner: nie blokuje wiersza po nieudanej walidacji (row nadal edytowalny)', async () => {
    vi.mocked(validatePyrCodeAPI).mockRejectedValueOnce(new Error('Not found'));
    renderComponent();
    const input = getLastEmptyInput();

    await act(async () => {
      fireEvent.change(input, { target: { value: 'PYR-INVALID' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(validatePyrCodeAPI).toHaveBeenCalledWith('PYR-INVALID');
    });

    // Po nieudanej walidacji input nadal dostępny (nie disabled)
    const inputAfter = getLastEmptyInput();
    expect(inputAfter).not.toBeDisabled();
  });

  /**
   * TEST REGRESJI: wybór z dropdownu strzałkami + Enter
   *
   * Bug: onKeyDown odpala się PO onChange w MUI Autocomplete.
   * Kiedy użytkownik wybiera opcję strzałkami + Enter:
   *   1. onChange odpala z { pyrcode: 'TEST123' }   ← poprawna wartość
   *   2. onKeyDown odpala z e.target.value = 'TEST'  ← wpisany fragment
   * Bez fixa: isValidationInProgress blokuje onChange, waliduje z 'TEST' → błąd.
   * Z fixem: onKeyDown wykrywa że onChange już wybrał opcję i pomija walidację.
   */
  it('dropdown: Enter po zaznaczeniu opcji waliduje kod opcji, nie fragment tekstu', async () => {
    vi.mocked(validatePyrCodeAPI).mockImplementation((code) => {
      if (code === 'TEST123')
        return Promise.resolve(mockValidationOk);
      return Promise.reject(new Error('Not found'));
    });

    renderComponent();
    const input = getLastEmptyInput();

    // Wpisz fragment → wyzwól wyszukiwanie → dropdown się otworzy
    await act(async () => {
      fireEvent.mouseDown(input);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'TEST' } });
    });

    // Poczekaj na dropdown (MUI Autocomplete renderuje listbox w portalu)
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeInTheDocument();
    });

    // Zaznacz pierwszą opcję strzałką w dół
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Enter = wybór opcji (MUI woła onChange z opcją PRZED naszym onKeyDown)
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      // Musi walidować kodem wybranej opcji TEST123, nie fragmentem 'TEST'
      expect(validatePyrCodeAPI).toHaveBeenCalledWith('TEST123');
    });

    expect(validatePyrCodeAPI).not.toHaveBeenCalledWith('TEST');
  });

  it('powinien usunąć zwalidowany kod PYR z listy sugestii', async () => {
    // Przygotuj mocki
    vi.mocked(validatePyrCodeAPI).mockResolvedValueOnce(mockValidationOk);
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