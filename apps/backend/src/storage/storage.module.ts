import { Module } from '@nestjs/common';
import { FileStorageGateway } from './gateways/file-storage.gateway';
import { LocalFileStorageGateway } from './local-file-storage.gateway';

/**
 * StorageModule — Módulo de almacenamiento
 *
 * Este es el módulo que "cablea" la abstracción con su implementación.
 * 
 * La línea clave es:
 *   provide: FileStorageGateway,      ← "Cuando alguien pida FileStorageGateway..."
 *   useClass: LocalFileStorageGateway  ← "...dale esta implementación"
 * 
 * Nota el `exports`: esto permite que OTROS módulos (como CoursesModule)
 * puedan inyectar FileStorageGateway en sus use-cases.
 */
@Module({
    providers: [
        {
            provide: FileStorageGateway,
            useClass: LocalFileStorageGateway,
        },
    ],
    exports: [FileStorageGateway],
})
export class StorageModule { }
