import { Injectable } from '@nestjs/common';
import {
  CertificateCourse,
  CertificateSearchGateway,
} from '../gateways/certificate-search.gateway';

@Injectable()
export class ListCertificateCoursesUseCase {
  constructor(private readonly searchGateway: CertificateSearchGateway) {}

  execute(): Promise<CertificateCourse[]> {
    return this.searchGateway.listCourses();
  }
}
