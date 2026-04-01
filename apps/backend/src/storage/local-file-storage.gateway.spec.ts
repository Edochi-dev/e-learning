import { existsSync } from 'fs';
import { unlink, readFile, writeFile, mkdir } from 'fs/promises';
import { LocalFileStorageGateway } from './local-file-storage.gateway';

/**
 * Tests para LocalFileStorageGateway — la implementación concreta del storage.
 *
 * A diferencia de los tests de use cases (donde mockeamos gateways abstractos),
 * aquí testeamos la IMPLEMENTACIÓN REAL. Pero mockeamos el filesystem
 * (fs, fs/promises) porque:
 *   - No queremos crear/borrar archivos reales en cada test
 *   - Queremos controlar qué "existe" y qué no en el disco virtual
 *
 * El foco principal es deleteByUrl, que encapsula la lógica que antes
 * estaba duplicada en 5+ use cases: isLocalFile + replace('/static/') + deleteFile.
 */

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
}));

const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockedUnlink = unlink as jest.MockedFunction<typeof unlink>;
const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockedWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockedMkdir = mkdir as jest.MockedFunction<typeof mkdir>;

describe('LocalFileStorageGateway', () => {
  let gateway: LocalFileStorageGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new LocalFileStorageGateway();
  });

  // ──────────────────────────────────────────────────────────
  // isLocalFile
  // ──────────────────────────────────────────────────────────

  it('isLocalFile retorna true para URLs que empiezan con /static/', () => {
    expect(gateway.isLocalFile('/static/videos/clase1.mp4')).toBe(true);
    expect(gateway.isLocalFile('/static/thumbnails/img.jpg')).toBe(true);
  });

  it('isLocalFile retorna false para URLs externas', () => {
    expect(gateway.isLocalFile('https://youtube.com/watch?v=abc')).toBe(false);
    expect(gateway.isLocalFile('https://cdn.example.com/img.jpg')).toBe(false);
  });

  // ──────────────────────────────────────────────────────────
  // deleteByUrl — el método que encapsula la lógica de cleanup
  // ──────────────────────────────────────────────────────────

  /**
   * Caso principal: URL local → extrae ruta relativa → borra el archivo.
   * '/static/videos/clase1.mp4' → deleteFile('videos/clase1.mp4')
   */
  it('deleteByUrl borra el archivo cuando la URL es local y existe en disco', async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedUnlink.mockResolvedValue(undefined);

    await gateway.deleteByUrl('/static/videos/clase1.mp4');

    // unlink debe recibir la ruta absoluta (publicDir + ruta relativa)
    expect(mockedUnlink).toHaveBeenCalledTimes(1);
    const calledPath = mockedUnlink.mock.calls[0][0] as string;
    expect(calledPath).toContain('videos/clase1.mp4');
  });

  /**
   * URL externa → no hace nada. No intenta borrar del filesystem.
   */
  it('deleteByUrl ignora silenciosamente URLs externas', async () => {
    await gateway.deleteByUrl('https://youtube.com/watch?v=abc');

    expect(mockedExistsSync).not.toHaveBeenCalled();
    expect(mockedUnlink).not.toHaveBeenCalled();
  });

  /**
   * URL local pero el archivo no existe en disco → no lanza error.
   * Esto pasa si el archivo ya fue borrado manualmente o por otro proceso.
   */
  it('deleteByUrl no falla si el archivo local no existe en disco', async () => {
    mockedExistsSync.mockReturnValue(false);

    // No debe lanzar ninguna excepción
    await expect(
      gateway.deleteByUrl('/static/thumbnails/borrada.jpg'),
    ).resolves.toBeUndefined();

    // existsSync se llamó (para verificar), pero unlink no (no existe)
    expect(mockedExistsSync).toHaveBeenCalled();
    expect(mockedUnlink).not.toHaveBeenCalled();
  });

  /**
   * Verifica que la extracción de ruta relativa funciona correctamente.
   * '/static/certificates/generated/abc.pdf' → 'certificates/generated/abc.pdf'
   */
  it('deleteByUrl extrae correctamente la ruta relativa para subcarpetas profundas', async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedUnlink.mockResolvedValue(undefined);

    await gateway.deleteByUrl('/static/certificates/generated/abc.pdf');

    const calledPath = mockedUnlink.mock.calls[0][0] as string;
    expect(calledPath).toContain('certificates/generated/abc.pdf');
    expect(calledPath).not.toContain('/static/');
  });

  // ──────────────────────────────────────────────────────────
  // toRelativePath — extrae ruta relativa de una URL pública
  // ──────────────────────────────────────────────────────────

  it('toRelativePath extrae la ruta relativa quitando /static/', () => {
    expect(gateway.toRelativePath('/static/videos/clase1.mp4')).toBe(
      'videos/clase1.mp4',
    );
    expect(
      gateway.toRelativePath('/static/certificates/generated/abc.pdf'),
    ).toBe('certificates/generated/abc.pdf');
  });

  // ──────────────────────────────────────────────────────────
  // readFileByUrl — lee un archivo dado su URL pública
  // ──────────────────────────────────────────────────────────

  it('readFileByUrl lee el archivo del filesystem usando la ruta relativa', async () => {
    const fakeBuffer = Buffer.from('pdf-content');
    mockedReadFile.mockResolvedValue(fakeBuffer);

    const result = await gateway.readFileByUrl(
      '/static/certificates/templates/tpl.pdf',
    );

    expect(result).toBe(fakeBuffer);
    const calledPath = mockedReadFile.mock.calls[0][0] as string;
    expect(calledPath).toContain('certificates/templates/tpl.pdf');
    expect(calledPath).not.toContain('/static/');
  });

  // ──────────────────────────────────────────────────────────
  // saveBuffer — guarda un buffer y retorna la URL pública
  // ──────────────────────────────────────────────────────────

  it('saveBuffer crea la carpeta, escribe el archivo, y retorna la URL pública', async () => {
    mockedMkdir.mockResolvedValue(undefined);
    mockedWriteFile.mockResolvedValue(undefined);

    const result = await gateway.saveBuffer(
      Buffer.from('pdf-bytes'),
      'certificates/generated',
      'abc.pdf',
    );

    expect(result).toBe('/static/certificates/generated/abc.pdf');
    expect(mockedMkdir).toHaveBeenCalledTimes(1);
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);

    const writtenPath = mockedWriteFile.mock.calls[0][0] as string;
    expect(writtenPath).toContain('certificates/generated/abc.pdf');
  });
});
