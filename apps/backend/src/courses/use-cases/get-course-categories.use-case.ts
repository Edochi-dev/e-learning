import { Injectable } from '@nestjs/common';
import { CourseGateway } from '../gateways/course.gateway';

/**
 * GetCourseCategoriesUseCase — Devuelve las categorías distintas existentes,
 * para poblar el filtro de categorías del catálogo.
 */
@Injectable()
export class GetCourseCategoriesUseCase {
  constructor(private readonly courseGateway: CourseGateway) {}

  async execute(): Promise<string[]> {
    return this.courseGateway.findDistinctCategories();
  }
}
