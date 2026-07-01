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

  it('findAll pide la página con ?page&limit y devuelve la respuesta paginada completa', async () => {
    const paginated = {
      data: [{ id: '1', title: 'Manicure Básico' }],
      total: 30,
      page: 2,
      limit: 12,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paginated),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await gateway.findAll(2, 12);

    // Debe trasladar page/limit como query params al backend.
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/courses?page=2&limit=12`);
    // Y devolver el objeto paginado completo (data + total + page + limit),
    // para que el hook pueda construir los controles de paginación.
    expect(result).toEqual(paginated);
  });

  it('findAll usa la primera página (page=1, limit=12) por defecto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], total: 0, page: 1, limit: 12 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await gateway.findAll();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/courses?page=1&limit=12`);
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
