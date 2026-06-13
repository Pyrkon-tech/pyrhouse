import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BarcodeScanner from '../BarcodeScanner';
import Quagga from '@ericblade/quagga2';

// The camera cannot run headless — Quagga is mocked at the module boundary with a
// controllable detection emitter. Everything else (PYR fast-path, the 3-scan
// confirmation buffer, lifecycle/cleanup) is the real component logic.

type DetectionHandler = (result: { codeResult?: { code?: string | null } }) => void;

const emitter: { handler: DetectionHandler | null } = { handler: null };

vi.mock('@ericblade/quagga2', () => ({
  default: {
    init: vi.fn((_config: unknown, cb: (err: unknown) => void) => cb(undefined)),
    start: vi.fn(),
    stop: vi.fn(),
    onDetected: vi.fn((h: DetectionHandler) => { emitter.handler = h; }),
    offDetected: vi.fn(),
  },
}));

const emitScan = (code: string) => emitter.handler?.({ codeResult: { code } });

describe('BarcodeScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emitter.handler = null;
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  const renderScanner = async () => {
    const onScan = vi.fn();
    const onClose = vi.fn();
    render(<BarcodeScanner onScan={onScan} onClose={onClose} />);
    await waitFor(() => expect(Quagga.init).toHaveBeenCalled());
    await waitFor(() => expect(emitter.handler).not.toBeNull());
    return { onScan, onClose };
  };

  it('initializes the camera stream with a CODE128 reader', async () => {
    await renderScanner();

    const [config] = vi.mocked(Quagga.init).mock.calls[0] as unknown as [
      { inputStream: { type: string; target: unknown }; decoder: { readers: string[] } },
      unknown,
    ];
    expect(config.inputStream.type).toBe('LiveStream');
    expect(config.inputStream.target).toBeInstanceOf(HTMLElement);
    expect(config.decoder.readers).toEqual(['code_128_reader']);
    expect(Quagga.start).toHaveBeenCalled();
  });

  it('accepts a PYR code immediately on first detection', async () => {
    const { onScan, onClose } = await renderScanner();

    emitScan('PYR-0042');

    expect(onScan).toHaveBeenCalledWith('PYR-0042');
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(Quagga.stop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('requires 3 consistent detections for non-PYR codes (noise filter)', async () => {
    const { onScan } = await renderScanner();

    emitScan('SN123456');
    emitScan('SN123456');
    expect(onScan).not.toHaveBeenCalled();

    emitScan('SN123456');
    expect(onScan).toHaveBeenCalledWith('SN123456');
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('does not mix confirmation counts between different codes', async () => {
    const { onScan } = await renderScanner();

    emitScan('SN-AAA');
    emitScan('SN-BBB');
    emitScan('SN-AAA');
    emitScan('SN-BBB');
    expect(onScan).not.toHaveBeenCalled();

    emitScan('SN-AAA');
    expect(onScan).toHaveBeenCalledWith('SN-AAA');
  });

  it('ignores detections without a code', async () => {
    const { onScan } = await renderScanner();

    emitter.handler?.({ codeResult: { code: null } });
    emitter.handler?.({});

    expect(onScan).not.toHaveBeenCalled();
  });

  it('stops the camera and unregisters the handler on close and unmount', async () => {
    const onScan = vi.fn();
    const onClose = vi.fn();
    const { unmount } = render(<BarcodeScanner onScan={onScan} onClose={onClose} />);
    await waitFor(() => expect(Quagga.init).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('close'));
    expect(onClose).toHaveBeenCalled();
    expect(Quagga.stop).toHaveBeenCalled();
    expect(Quagga.offDetected).toHaveBeenCalled();

    unmount();
    expect(vi.mocked(Quagga.stop).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
