import { Injectable } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { CreateCourseDto } from '../dto/create-course.dto';

@Injectable()
export class CreateCourseUseCase {
    constructor(
        private readonly courseGateway: CourseGateway,
        private readonly fileStorageGateway: FileStorageGateway,
    ) { }

    /**
     * Crea un curso, guardando primero la miniatura si fue enviada.
     *
     * @param dto       Los datos del curso (título, precio, descripción)
     * @param thumbnail El archivo de imagen recibido por Multer (puede ser undefined)
     */
    async execute(dto: CreateCourseDto, thumbnail?: Express.Multer.File): Promise<Course> {
        // Si el admin subió una imagen, la guardamos y obtenemos su URL pública.
        // Si no subió ninguna, thumbnailUrl simplemente no se incluye en el curso.
        if (thumbnail) {
            dto.thumbnailUrl = await this.fileStorageGateway.saveFile(thumbnail, 'thumbnails');
        }

        return this.courseGateway.create(dto as unknown as Course);
    }
}
