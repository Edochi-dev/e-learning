import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpCourseGateway } from './HttpCourseGateway';

/**
 * Tests de HttpCourseGateway — la implementación HTTP del contrato CourseGateway.
 *
 * ¿Qué verificamos? El CONTRATO con la API, no la red real:
 *   - que llama al endpoint correcto,
 *   - que desempaqueta la respuesta paginada ({ data: [...] }) y devuelve data,
 *   - que convierte un status HTTP no-ok en un Error (para que el hook lo capture).
 *
 * Mockeamos `fetch` (global del navegador) para no hacer peticiones reales:
 * el test es rápido, determinista y no depende de que el backend esté arriba.
 */
describe('HttpCourseGateway', () => {
  const baseUrl = 'http://api.test';
  let gateway: HttpCourseGateway;

  beforeEach(() => {
    gateway = new HttpCourseGateway(baseUrl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('findAll llama a /courses y devuelve el array `data` de la respuesta paginada', async () => {
    const courses = [{ id: '1', title: 'Manicure Básico' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: courses, total: 1, page: 1, limit: 10 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await gateway.findAll();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/courses`);
    // El backend responde paginado; el gateway debe entregar solo el array.
    expect(result).toEqual(courses);
  });

  it('findAll lanza un Error cuando la respuesta no es ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, statusText: 'Server Error' }),
    );

    // El hook depende de este throw para poblar su estado `error`.
    await expect(gateway.findAll()).rejects.toThrow(/Failed to fetch courses/);
  });

  it('findOne llama a /courses/:id y devuelve el curso', async () => {
    const course = { id: '42', title: 'Nail Art' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(course),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await gateway.findOne('42');

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/courses/42`);
    expect(result).toEqual(course);
  });
});
