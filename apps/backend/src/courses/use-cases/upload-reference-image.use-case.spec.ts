import { Test } from '@nestjs/testing';
import { UploadReferenceImageUseCase } from './upload-reference-image.use-case';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

/**
 * Tests para UploadReferenceImageUseCase — sube la imagen de referencia de
 * una lección tipo corrección y devuelve su URL pública.
 *
 * Este Use Case es deliberadamente delgado: su única responsabilidad es
 * delegar en el FileStorageGateway. Por eso lo que verificamos NO es "cómo
 * se guarda el archivo" (eso es responsabilidad del gateway y se testea en
 * su propia implementación), sino el CONTRATO:
 *   - que delega en saveFile con el archivo recibido,
 *   - que fija la subcarpeta 'images' (no la elige el cliente),
 *   - que propaga la URL que devuelve el gateway.
 *
 * Testear la colaboración (no la implementación del gateway) es lo correcto:
 * si mañana cambiamos de disco local a S3, este test debe seguir pasando.
 */
describe('UploadReferenceImageUseCase', () => {
  let useCase: UploadReferenceImageUseCase;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  // Objeto falso con la "forma" de un archivo de Multer. No necesitamos un
  // archivo real: el gateway está mockeado y nunca toca el disco.
  const fakeFile = {
    originalname: 'referencia.jpg',
    buffer: Buffer.from('fake-image'),
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        UploadReferenceImageUseCase,
        {
          provide: FileStorageGateway,
          useValue: {
            saveFile: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(UploadReferenceImageUseCase);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  it('guarda el archivo en la subcarpeta "images" y devuelve su URL', async () => {
    fileStorageGateway.saveFile.mockResolvedValue('/static/images/uuid.jpg');

    const url = await useCase.execute(fakeFile);

    // Delega con el archivo recibido y la carpeta fija 'images'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fileStorageGateway.saveFile).toHaveBeenCalledWith(
      fakeFile,
      'images',
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fileStorageGateway.saveFile).toHaveBeenCalledTimes(1);
    // Propaga la URL tal cual la devuelve el gateway.
    expect(url).toBe('/static/images/uuid.jpg');
  });

  it('propaga el error si el almacenamiento falla', async () => {
    fileStorageGateway.saveFile.mockRejectedValue(new Error('disk full'));

    // El Use Case no traga el error: deja que suba al controller para que
    // NestJS responda con el status adecuado.
    await expect(useCase.execute(fakeFile)).rejects.toThrow('disk full');
  });
});
