import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSubmissionStatus } from './useSubmissionStatus';
import type {
    AssignmentSubmission,
    CorrectionGateway,
    CorrectionReview,
} from '../gateways/CorrectionGateway';

function submissionWith(status: CorrectionReview['transcriptStatus'], transcript: string | null = null) {
    return {
        id: 's1',
        status: 'rejected',
        reviews: [{ id: 'r1', transcriptStatus: status, transcript }],
    } as unknown as AssignmentSubmission;
}

describe('useSubmissionStatus', () => {
    let getMyStatus: ReturnType<typeof vi.fn>;
    let gateway: CorrectionGateway;
    const polling = { intervalMs: 1000, maxPolls: 3 };

    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        getMyStatus = vi.fn();
        gateway = { getMyStatus } as unknown as CorrectionGateway;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('no vuelve a consultar si no hay transcripciones pendientes', async () => {
        getMyStatus.mockResolvedValue(submissionWith('done', 'Hola'));
        const { result } = renderHook(() => useSubmissionStatus(gateway, 'l1', polling));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
        expect(getMyStatus).toHaveBeenCalledTimes(1);
    });

    it('consulta hasta que la transcripción está lista y entonces se detiene', async () => {
        getMyStatus
            .mockResolvedValueOnce(submissionWith('pending'))
            .mockResolvedValueOnce(submissionWith('processing'))
            .mockResolvedValue(submissionWith('done', 'Hola Ana'));
        const { result } = renderHook(() => useSubmissionStatus(gateway, 'l1', polling));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
        expect(result.current.submission?.reviews[0].transcript).toBe('Hola Ana');

        await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
        expect(getMyStatus).toHaveBeenCalledTimes(3);
    });

    it('se rinde después del tope de consultas', async () => {
        getMyStatus.mockResolvedValue(submissionWith('processing'));
        const { result } = renderHook(() => useSubmissionStatus(gateway, 'l1', polling));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
        // 1 carga inicial + 3 consultas de espera.
        expect(getMyStatus).toHaveBeenCalledTimes(4);
    });
});
