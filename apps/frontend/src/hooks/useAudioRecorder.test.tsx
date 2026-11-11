import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAudioRecorder } from './useAudioRecorder';

class FakeMediaRecorder {
    static isTypeSupported = (type: string) => type === 'audio/mp4';
    static last: FakeMediaRecorder | null = null;
    state: 'inactive' | 'recording' = 'inactive';
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;

    constructor(_stream: MediaStream, options?: { mimeType?: string }) {
        this.mimeType = options?.mimeType ?? '';
        FakeMediaRecorder.last = this;
    }

    start() {
        this.state = 'recording';
    }

    stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['voz'], { type: this.mimeType }) });
        this.onstop?.();
    }
}

describe('useAudioRecorder', () => {
    const stopTrack = vi.fn();
    const getUserMedia = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
        stopTrack.mockReset();
        getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
        vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
        Object.defineProperty(navigator, 'mediaDevices', {
            value: { getUserMedia },
            configurable: true,
        });
        vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:grabacion'), revokeObjectURL: vi.fn() });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('graba con el formato que soporta el navegador y entrega el audio al detener', async () => {
        const { result } = renderHook(() => useAudioRecorder(120));

        await act(() => result.current.start());
        expect(result.current.status).toBe('recording');
        expect(FakeMediaRecorder.last?.mimeType).toBe('audio/mp4');

        act(() => result.current.stop());
        expect(result.current.status).toBe('recorded');
        expect(result.current.recording?.blob.type).toBe('audio/mp4');
        expect(result.current.recording?.url).toBe('blob:grabacion');
        expect(stopTrack).toHaveBeenCalled();
    });

    it('se detiene sola al llegar al máximo', async () => {
        const { result } = renderHook(() => useAudioRecorder(2));

        await act(() => result.current.start());
        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        expect(result.current.status).toBe('recorded');
        expect(result.current.elapsedSeconds).toBe(2);
    });

    it('explica qué hacer si se niega el permiso del micrófono', async () => {
        getUserMedia.mockRejectedValue(new Error('NotAllowedError'));
        const { result } = renderHook(() => useAudioRecorder(120));

        await act(() => result.current.start());

        expect(result.current.status).toBe('idle');
        expect(result.current.error).toMatch(/permiso para usar el micrófono/);
    });

    it('reset descarta la grabación en curso y suelta el micrófono', async () => {
        const { result } = renderHook(() => useAudioRecorder(120));

        await act(() => result.current.start());
        act(() => result.current.reset());

        expect(result.current.status).toBe('idle');
        expect(result.current.recording).toBeNull();
        expect(stopTrack).toHaveBeenCalled();
    });
});
