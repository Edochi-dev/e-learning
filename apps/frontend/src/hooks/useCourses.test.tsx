import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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
  it('arranca en loading=true y termina con los cursos cargados', async () => {
    const courses = [{ id: '1', title: 'Manicure' }] as never;
    const gateway = fakeGateway(vi.fn().mockResolvedValue(courses));

    const { result } = renderHook(() => useCourses(gateway));

    // Estado inicial, antes de que resuelva la promesa.
    expect(result.current.loading).toBe(true);
    expect(result.current.courses).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.courses).toEqual(courses);
    expect(result.current.error).toBeNull();
  });

  it('captura el mensaje cuando el gateway falla', async () => {
    const gateway = fakeGateway(vi.fn().mockRejectedValue(new Error('API caída')));

    const { result } = renderHook(() => useCourses(gateway));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('API caída');
    expect(result.current.courses).toEqual([]);
  });
});
