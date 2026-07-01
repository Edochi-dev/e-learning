import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCourses } from './useCourses';
import type { CourseGateway } from '../gateways/CourseGateway';

/**
 * Tests del hook useCourses — dueño del estado loading/error/courses.
 *
 * El hook recibe el gateway por parámetro (inyección de dependencias), así que
 * en el test le pasamos un gateway FALSO con solo el método que usa (findAll).
 * No tocamos HTTP: probamos la LÓGICA DE ESTADO del hook de forma aislada.
 *
 * renderHook monta el hook en un componente de prueba; waitFor espera a que el
 * efecto asíncrono termine (React actualiza el estado fuera del render inicial).
 */

// Helper: construye un gateway falso con solo lo que el hook necesita.
function fakeGateway(findAll: CourseGateway['findAll']): CourseGateway {
  return { findAll } as unknown as CourseGateway;
}

describe('useCourses', () => {
  it('arranca en loading=true y termina con los cursos + paginación', async () => {
    const courses = [{ id: '1', title: 'Manicure' }] as never;
    // El gateway devuelve la respuesta paginada; el hook desempaqueta `data`.
    const gateway = fakeGateway(
      vi.fn().mockResolvedValue({ data: courses, total: 30, page: 1, limit: 12 }),
    );

    const { result } = renderHook(() => useCourses(gateway));

    // Estado inicial, antes de que resuelva la promesa.
    expect(result.current.loading).toBe(true);
    expect(result.current.courses).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.courses).toEqual(courses);
    expect(result.current.error).toBeNull();
    // 30 cursos / 12 por página = 3 páginas (Math.ceil).
    expect(result.current.totalPages).toBe(3);
  });

  it('captura el mensaje cuando el gateway falla', async () => {
    const gateway = fakeGateway(vi.fn().mockRejectedValue(new Error('API caída')));

    const { result } = renderHook(() => useCourses(gateway));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('API caída');
    expect(result.current.courses).toEqual([]);
  });

  it('vuelve a pedir la página cuando cambia setPage', async () => {
    const findAll = vi
      .fn()
      .mockResolvedValue({ data: [], total: 30, page: 1, limit: 12 });
    const gateway = fakeGateway(findAll);

    const { result } = renderHook(() => useCourses(gateway));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Primera carga: página 1.
    expect(findAll).toHaveBeenLastCalledWith(1, 12);

    // Al cambiar de página, el hook debe re-pedir con el nuevo número.
    act(() => result.current.setPage(2));
    await waitFor(() => expect(findAll).toHaveBeenLastCalledWith(2, 12));
  });
});
