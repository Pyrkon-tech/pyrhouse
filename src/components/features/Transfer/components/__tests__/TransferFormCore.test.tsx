import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransferFormCore from '../TransferFormCore';

// ---- Mocks -------------------------------------------------------------------

const validatePyrCodeAPI = vi.fn();
const createTransferAPI = vi.fn();
const searchPyrCodesAPI = vi.fn();
const createTransferFromQuestAPI = vi.fn();
const getUsersAPI = vi.fn();
const fetchStocks = vi.fn();

vi.mock('../../../../../hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [
      { id: 1, name: 'Magazyn' },
      { id: 2, name: 'Pawilon A' },
    ],
    refetch: vi.fn(),
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../../../hooks/useStocks', () => ({
  useStocks: () => ({
    stocks: [],
    fetchStocks,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../../../services/transferService', () => ({
  validatePyrCodeAPI: (...args: unknown[]) => validatePyrCodeAPI(...args),
  createTransferAPI: (...args: unknown[]) => createTransferAPI(...args),
  searchPyrCodesAPI: (...args: unknown[]) => searchPyrCodesAPI(...args),
}));

vi.mock('../../../../../services/questService', () => ({
  createTransferFromQuestAPI: (...args: unknown[]) => createTransferFromQuestAPI(...args),
}));

vi.mock('../../../../../services/userService', () => ({
  getUsersAPI: (...args: unknown[]) => getUsersAPI(...args),
}));

// ---- Helpers -----------------------------------------------------------------

const getPyrInputs = () => screen.getAllByPlaceholderText('Wpisz kod PYR') as HTMLInputElement[];

/** Simulates the barcode scanner: types the code and presses Enter */
const scanCode = (input: HTMLInputElement, code: string) => {
  fireEvent.change(input, { target: { value: code } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

const validAsset = { id: 10, category: { id: 3, label: 'Kabel' } };

describe('TransferFormCore (scanner-critical form)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchPyrCodesAPI.mockResolvedValue([]);
    getUsersAPI.mockResolvedValue([
      { id: 5, username: 'wolo1', fullname: 'Wolo Pierwszy' },
      { id: 6, username: 'wolo2', fullname: 'Wolo Drugi' },
    ]);
    validatePyrCodeAPI.mockResolvedValue(validAsset);
    createTransferAPI.mockResolvedValue({ id: 77 });
    createTransferFromQuestAPI.mockResolvedValue({ transfer_id: 88 });
  });

  it('Enter in the PYR field validates the code instead of submitting the form', async () => {
    render(<TransferFormCore />);

    scanCode(getPyrInputs()[0], 'PYR-001');

    await waitFor(() => expect(validatePyrCodeAPI).toHaveBeenCalledWith('PYR-001'));
    // No submit happened: confirmation dialog stays closed, no API create call
    expect(screen.queryByText('Potwierdź szczegóły questa')).not.toBeInTheDocument();
    expect(createTransferAPI).not.toHaveBeenCalled();
  });

  it('does not trigger validation for codes shorter than 2 chars', async () => {
    render(<TransferFormCore />);

    scanCode(getPyrInputs()[0], 'P');

    await new Promise((r) => setTimeout(r, 50));
    expect(validatePyrCodeAPI).not.toHaveBeenCalled();
  });

  it('appends a fresh row and marks the item available after successful validation', async () => {
    render(<TransferFormCore />);

    scanCode(getPyrInputs()[0], 'PYR-001');

    await waitFor(() => expect(screen.getByText('Dostępny')).toBeInTheDocument());
    // A new empty scanner row was appended
    await waitFor(() => expect(getPyrInputs()).toHaveLength(2));
    // Category of the validated asset is shown
    expect(screen.getByText('Kabel')).toBeInTheDocument();
  });

  it('marks the row as failed when the code is not found', async () => {
    validatePyrCodeAPI.mockRejectedValue(new Error('not found'));
    render(<TransferFormCore />);

    scanCode(getPyrInputs()[0], 'PYR-BAD');

    await waitFor(() => expect(screen.getByText('Nie znaleziono')).toBeInTheDocument());
    expect(getPyrInputs()).toHaveLength(1);
  });

  it('preselects volunteers from initialVolunteerIds (dispatch flow)', async () => {
    render(<TransferFormCore initialVolunteerIds={[5]} />);

    await waitFor(() => expect(screen.getByText('wolo1')).toBeInTheDocument());
    expect(screen.queryByText('wolo2')).not.toBeInTheDocument();
  });

  it('creates a transfer with the validated assets payload', async () => {
    // questLocationId pre-fills the target location without quest mode
    render(<TransferFormCore questLocationId={2} />);

    scanCode(getPyrInputs()[0], 'PYR-001');
    await waitFor(() => expect(screen.getByText('Dostępny')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Rozpocznij quest' }));
    await waitFor(() => expect(screen.getByText('Potwierdź szczegóły questa')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij transfer/ }));

    await waitFor(() => expect(createTransferAPI).toHaveBeenCalledWith({
      from_location_id: 1,
      location_id: 2,
      assets: [{ id: 10 }],
    }));
    expect(createTransferFromQuestAPI).not.toHaveBeenCalled();
  });

  it('uses the quest endpoint when questId is provided', async () => {
    const onSuccess = vi.fn();
    render(<TransferFormCore questId="Q-1" questLocationId={2} onSuccess={onSuccess} />);

    scanCode(getPyrInputs()[0], 'PYR-001');
    await waitFor(() => expect(screen.getByText('Dostępny')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Rozpocznij quest' }));
    await waitFor(() => expect(screen.getByText('Potwierdź szczegóły questa')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij transfer/ }));

    await waitFor(() => expect(createTransferFromQuestAPI).toHaveBeenCalledWith('Q-1', {
      from_location_id: 1,
      to_location_id: 2,
      stock_items: undefined,
      assets: [{ id: 10 }],
      users: undefined,
    }));
    expect(createTransferAPI).not.toHaveBeenCalled();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(88), { timeout: 2000 });
  });

  it('rejects submission without any validated items', async () => {
    render(<TransferFormCore questLocationId={2} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rozpocznij quest' }));
    await waitFor(() => expect(screen.getByText('Potwierdź szczegóły questa')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij transfer/ }));

    await waitFor(() => expect(screen.getByText('Dodaj co najmniej jeden zasób lub pozycję magazynową')).toBeInTheDocument());
    expect(createTransferAPI).not.toHaveBeenCalled();
  });

  it('rejects a duplicate PYR code without calling the API twice', async () => {
    render(<TransferFormCore />);

    scanCode(getPyrInputs()[0], 'PYR-001');
    await waitFor(() => expect(getPyrInputs()).toHaveLength(2));

    scanCode(getPyrInputs()[1], 'PYR-001');

    await waitFor(() => expect(screen.getByText('Nie znaleziono')).toBeInTheDocument());
    expect(validatePyrCodeAPI).toHaveBeenCalledTimes(1);
  });
});
