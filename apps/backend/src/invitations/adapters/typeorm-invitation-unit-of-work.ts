import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  InvitationTransaction,
  InvitationUnitOfWork,
} from '../gateways/invitation-unit-of-work.gateway';
import { User } from '../../users/entities/user.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { CourseInvitation } from '../entities/course-invitation.entity';
import { UsersService } from '../../users/users.service';
import { EnrollmentsRepository } from '../../enrollments/repositories/enrollments.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';

/**
 * Implementación del Unit of Work sobre TypeORM.
 *
 * `dataSource.transaction()` entrega un EntityManager atado a la transacción.
 * Los repositorios se construyen a mano con ese manager, en vez de inyectar los
 * de siempre: los inyectados por Nest cuelgan del manager por defecto y sus
 * escrituras quedarían FUERA de la transacción, que es justo el fallo que este
 * código existe para evitar — y uno que no da error, solo deja datos a medias.
 *
 * Construirlos así es posible porque los tres reciben un único Repository en el
 * constructor. Si alguno pasara a recibir más dependencias, este adapter es el
 * sitio donde eso saldría a la luz.
 */
@Injectable()
export class TypeOrmInvitationUnitOfWork implements InvitationUnitOfWork {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async run<T>(work: (tx: InvitationTransaction) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const tx: InvitationTransaction = {
        users: new UsersService(manager.getRepository(User)),
        enrollments: new EnrollmentsRepository(
          manager.getRepository(Enrollment),
        ),
        invitations: new InvitationsRepository(
          manager.getRepository(CourseInvitation),
        ),
      };

      return work(tx);
    });
  }
}
