import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from '../database/typeorm.config';
import { CertificatesCoreModule } from '../certificates/certificates-core.module';

/**
 * Minimal context for one-off maintenance commands. Deliberately not AppModule:
 * that one starts the push-reminder cron, which would run alongside the live
 * API and could send duplicate notifications. Migrations are left to the API.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...buildTypeOrmOptions(), migrationsRun: false }),
    CertificatesCoreModule,
  ],
})
export class MaintenanceCliModule {}
