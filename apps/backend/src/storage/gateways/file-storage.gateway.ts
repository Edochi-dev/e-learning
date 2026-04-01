/**
 * FileStorageGateway — Gateway Abstracto de Almacenamiento
 *
 * En Clean Architecture, los "gateways" son contratos (interfaces) que definen
 * QUÉ operaciones necesita nuestro sistema, sin decir CÓMO se hacen.
 *
 * Esto nos permite cambiar la implementación sin tocar la lógica de negocio.
 * Hoy usamos archivos locales, mañana podríamos usar AWS S3, y solo
 * cambiaríamos la clase que implementa este gateway.
 */
export abstract class FileStorageGateway {
  /**
   * Guarda un archivo subido en una carpeta del almacenamiento.
   * @param file   El archivo recibido por Multer (tiene .buffer, .originalname, .mimetype)
   * @param folder Subcarpeta destino, ej: "thumbnails" o "videos"
   * @returns      La URL pública del archivo guardado, ej: "/static/thumbnails/uuid.jpg"
   *
   * Nota para el alumno: este método retorna una PROMESA de string porque
   * escribir en disco (o subir a S3) es una operación asíncrona — puede tardar.
   */
  abstract saveFile(file: Express.Multer.File, folder: string): Promise<string>;

  /**
   * Elimina un archivo del almacenamiento.
   * @param filePath Ruta relativa del archivo (ej: "videos/clase1.mp4")
   */
  abstract deleteFile(filePath: string): Promise<void>;

  /**
   * Determina si una URL apunta a un archivo local (servido por nuestro backend).
   * Esto es importante porque si alguien pone un link de YouTube, NO queremos
   * intentar borrar archivos del filesystem.
   */
  abstract isLocalFile(url: string): boolean;

  /**
   * Borra un archivo a partir de su URL pública (ej: "/static/videos/clase1.mp4").
   *
   * Encapsula toda la lógica de limpieza de archivos locales:
   *   1. ¿Es un archivo local? Si no, ignora silenciosamente (YouTube, Vimeo, etc.)
   *   2. Extrae la ruta relativa (detalle de implementación del storage)
   *   3. Borra el archivo del almacenamiento
   *
   * ¿Por qué este método existe?
   *   Sin él, cada Use Case que borra archivos necesita saber CÓMO se estructuran
   *   las URLs del storage (ej: que "/static/" es el prefijo). Ese conocimiento
   *   es un detalle de implementación que debe vivir en el gateway, no en la
   *   capa de negocio. Si migramos a S3, cada Use Case se rompería.
   */
  abstract deleteByUrl(url: string): Promise<void>;

  /**
   * Lee un archivo a partir de su URL pública y devuelve su contenido como Buffer.
   *
   * Ejemplo:
   *   readFileByUrl('/static/certificates/templates/tpl.pdf') → Buffer con el PDF
   *
   * El Use Case no sabe si el archivo está en disco local, en S3, o en otro lado.
   * Solo pasa la URL que guardó en la BD y recibe el contenido.
   */
  abstract readFileByUrl(url: string): Promise<Buffer>;

  /**
   * Guarda un buffer crudo (no un archivo Multer) en una subcarpeta del storage.
   *
   * @param buffer   Los bytes del archivo a guardar
   * @param folder   Subcarpeta destino (ej: "certificates/generated")
   * @param filename Nombre del archivo (ej: "uuid.pdf")
   * @returns        La URL pública del archivo guardado
   *
   * Diferencia con saveFile:
   *   - saveFile recibe un Express.Multer.File (upload HTTP)
   *   - saveBuffer recibe un Buffer (generado en código, ej: un PDF)
   */
  abstract saveBuffer(
    buffer: Buffer,
    folder: string,
    filename: string,
  ): Promise<string>;

  /**
   * Convierte una URL pública en la ruta relativa del storage.
   *
   * Ejemplo:
   *   toRelativePath('/static/videos/clase1.mp4') → 'videos/clase1.mp4'
   *
   * Usado por el flujo de signed URLs: el token se firma con la ruta relativa,
   * no con la URL completa. Este método encapsula el conocimiento de cómo
   * se estructuran las URLs del storage.
   */
  abstract toRelativePath(url: string): string;
}
