import { Injectable } from '@nestjs/common';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

/**
 * RemoveLessonUseCase — Elimina una lección y limpia su video si queda huérfano.
 *
 * Orden de operaciones — DB primero, archivos después:
 *
 *   1. Leer la lección → guardar videoUrl en memoria local (una variable).
 *   2. Borrar la lección de la DB.
 *      Si esto falla → el archivo sigue intacto, nada roto para el usuario.
 *   3. Comprobar si el videoUrl sigue siendo usado por alguna otra lección.
 *      Como la lección ya fue borrada, no necesitamos excluir ningún ID:
 *      si el conteo es 0, el archivo es un huérfano real.
 *   4. Borrar el archivo del disco (best-effort: si falla, solo es un storage leak,
 *      no afecta al usuario porque la lección ya no existe en la DB).
 *
 * ¿Por qué "DB primero"?
 * Si borráramos el archivo primero y después la DB fallara, el usuario vería
 * una lección cuyo video no existe — una rotura de datos irrecuperable.
 * Al revés: si el archivo no se borra, solo queda basura en disco, recuperable
 * con un script de limpieza.
 */
@Injectable()
export class RemoveLessonUseCase {
    constructor(
        private readonly courseGateway: CourseGateway,
        private readonly fileStorageGateway: FileStorageGateway,
    ) { }

    async execute(lessonId: string): Promise<void> {
        // Paso 1: leer el videoUrl ANTES de borrar (después ya no existirá en la DB)
        const lesson = await this.courseGateway.findLesson(lessonId);
        const videoUrl = lesson?.videoUrl ?? null;

        // Paso 2: borrar la lección — si falla aquí, el archivo sigue intacto ✅
        await this.courseGateway.removeLesson(lessonId);

        // Paso 3 y 4: limpieza de archivo (best-effort, el usuario ya no lo verá)
        if (videoUrl && this.fileStorageGateway.isLocalFile(videoUrl)) {
            // La lección ya no existe en la DB, así que preguntamos sin exclusiones:
            // "¿alguna lección restante sigue usando este archivo?"
            const stillInUse = await this.courseGateway.isVideoUrlInUse(videoUrl);
            if (!stillInUse) {
                const relativePath = videoUrl.replace('/static/', '');
                await this.fileStorageGateway.deleteFile(relativePath);
            }
        }
    }
}
