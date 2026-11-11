import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCertificateSearch } from './useCertificateSearch';
import type { CertificateGateway } from '../gateways/CertificateGateway';

function fakeGateway(overrides: Partial<CertificateGateway> = {}): CertificateGateway {
  return {
    searchCertificates: vi.fn().mockResolvedValue([]),
    listCertificateCourses: vi.fn().mockResolvedValue([]),
    deleteCertificates: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as CertificateGateway;
}

describe('useCertificateSearch', () => {
  it('carga los cursos del filtro al montar', async () => {
    const courses = [{ abbreviation: 'MEP', name: 'Máster' }];
    const gateway = fakeGateway({
      listCertificateCourses: vi.fn().mockResolvedValue(courses),
    });

    const { result } = renderHook(() => useCertificateSearch(gateway));

    await waitFor(() => expect(result.current.courses).toEqual(courses));
  });

  it('busca con los filtros recibidos', async () => {
    const found = [{ id: '1' }] as never;
    const gateway = fakeGateway({ searchCertificates: vi.fn().mockResolvedValue(found) });
    const { result } = renderHook(() => useCertificateSearch(gateway));

    await act(() => result.current.search({ course: 'MEP' }));

    expect(gateway.searchCertificates).toHaveBeenCalledWith({ course: 'MEP' });
    expect(result.current.certificates).toEqual(found);
    expect(result.current.loading).toBe(false);
  });

  it('descarta la respuesta de una búsqueda que ya fue reemplazada', async () => {
    let resolveSlow: (value: never) => void = () => {};
    const slow = new Promise<never>(resolve => { resolveSlow = resolve; });
    const fresh = [{ id: 'fresh' }] as never;
    const gateway = fakeGateway({
      searchCertificates: vi.fn()
        .mockReturnValueOnce(slow)
        .mockResolvedValueOnce(fresh),
    });
    const { result } = renderHook(() => useCertificateSearch(gateway));

    let first: Promise<void> = Promise.resolve();
    act(() => { first = result.current.search({ search: 'a' }); });
    await act(() => result.current.search({ search: 'an' }));
    await act(async () => {
      resolveSlow([{ id: 'stale' }] as never);
      await first;
    });

    expect(result.current.certificates).toEqual(fresh);
  });

  it('tras eliminar, repite la última búsqueda y recarga los cursos', async () => {
    const gateway = fakeGateway();
    const { result } = renderHook(() => useCertificateSearch(gateway));
    await act(() => result.current.search({ course: 'MEP' }));

    await act(() => result.current.deleteCertificates(['1', '2']));

    expect(gateway.deleteCertificates).toHaveBeenCalledWith(['1', '2']);
    expect(gateway.searchCertificates).toHaveBeenLastCalledWith({ course: 'MEP' });
    expect(gateway.listCertificateCourses).toHaveBeenCalledTimes(2);
  });

  it('si eliminar falla, propaga el error y no vuelve a buscar', async () => {
    const gateway = fakeGateway({
      deleteCertificates: vi.fn().mockRejectedValue(new Error('No encontrado')),
    });
    const { result } = renderHook(() => useCertificateSearch(gateway));
    await act(() => result.current.search({}));

    await expect(result.current.deleteCertificates(['x'])).rejects.toThrow('No encontrado');
    expect(gateway.searchCertificates).toHaveBeenCalledTimes(1);
  });
});
