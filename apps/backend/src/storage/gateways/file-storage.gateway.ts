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
}
