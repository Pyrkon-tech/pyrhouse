import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { jsPDF } from 'jspdf';
import { BarcodeGenerator } from '../BarcodeGenerator';

// Functional tests: JsBarcode and jsPDF run for REAL (node-canvas provides a 2d
// context in jsdom). Only `save()` is stubbed — it touches the browser download
// machinery (Blob URLs) that jsdom does not implement. `save` is an own instance
// property in jspdf v4, so the stub is a subclass returned from a partial mock.
const savedDocs = vi.hoisted(() => [] as unknown[]);

vi.mock('jspdf', async (importOriginal) => {
  const mod = await importOriginal<typeof import('jspdf')>();
  const RealJsPDF = mod.jsPDF as unknown as new (...args: unknown[]) => jsPDF;
  // jsPDF's constructor returns its own API object, so subclass overrides are
  // lost — patch `save` directly on the returned instance instead
  function WrappedJsPDF(...args: unknown[]): jsPDF {
    const instance = new RealJsPDF(...args);
    instance.save = ((..._saveArgs: unknown[]) => {
      savedDocs.push(instance);
      return instance;
    }) as jsPDF['save'];
    return instance;
  }
  return { ...mod, jsPDF: WrappedJsPDF };
});

const makeAsset = (id: number, pyrcode: string) => ({
  id,
  serial: `SN-${id}`,
  location: { id: 1, name: 'Magazyn' },
  category: { id: 3, label: 'Kabel' },
  status: 'available',
  pyrcode,
});

/** Data URL of an untouched canvas of the same size as the preview canvas */
const blankCanvasDataUrl = (width: number, height: number) => {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c.toDataURL();
};

describe('BarcodeGenerator (functional)', () => {
  beforeEach(() => {
    savedDocs.length = 0;
  });

  it('draws a real CODE128 barcode on the preview canvas', async () => {
    const { container } = render(<BarcodeGenerator assets={[makeAsset(1, 'PYR-0001')]} />);

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).not.toBeNull();

    await waitFor(() => {
      // JsBarcode resizes the canvas and paints bars — content must differ from a blank canvas
      expect(canvas.toDataURL()).not.toBe(blankCanvasDataUrl(canvas.width, canvas.height));
    });
    // No error message shown
    expect(screen.queryByText(/Nie udało się/)).not.toBeInTheDocument();
  });

  it('navigates between assets and re-renders the barcode', async () => {
    const assets = [makeAsset(1, 'PYR-0001'), makeAsset(2, 'PYR-0002')];
    const { container } = render(<BarcodeGenerator assets={assets} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    expect(screen.getByText('Element 1 z 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poprzedni' })).toBeDisabled();

    await waitFor(() => expect(canvas.toDataURL()).not.toBe(blankCanvasDataUrl(canvas.width, canvas.height)));
    const firstBarcode = canvas.toDataURL();

    fireEvent.click(screen.getByRole('button', { name: 'Następny' }));

    expect(screen.getByText('Element 2 z 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Następny' })).toBeDisabled();
    // Different pyrcode → different bars on the canvas
    await waitFor(() => expect(canvas.toDataURL()).not.toBe(firstBarcode));
  });

  it('generates a real PDF with one page per asset', async () => {
    const assets = [makeAsset(1, 'PYR-0001'), makeAsset(2, 'PYR-0002'), makeAsset(3, 'PYR-0003')];
    render(<BarcodeGenerator assets={assets} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));

    await waitFor(() => expect(savedDocs).toHaveLength(1));
    const doc = savedDocs[0] as jsPDF;
    // Real pipeline ran: CODE128 → canvas raster → PNG embedded per page
    expect(doc.getNumberOfPages()).toBe(3);
    expect(screen.queryByText('Nie udało się wygenerować PDF')).not.toBeInTheDocument();
    // Button returns to idle state
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pobierz PDF' })).toBeEnabled());
  });

  it('shows an error instead of crashing for invalid CODE128 input', async () => {
    // JsBarcode throws for characters outside CODE128 — the preview must surface
    // the error in the UI, not take the page down
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<BarcodeGenerator assets={[makeAsset(1, 'PYR-ą™')]} />);

    await waitFor(() =>
      expect(screen.getByText('Nie udało się wygenerować kodu dla "PYR-ą™"')).toBeInTheDocument()
    );

    // PDF generation with the same input fails gracefully too
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));
    await waitFor(() => expect(screen.getByText('Nie udało się wygenerować PDF')).toBeInTheDocument());
    expect(savedDocs).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
