import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserGateway } from '../users/gateways/user.gateway';
import { UserRole } from '@maris-nails/shared';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userGateway = app.get(UserGateway);

    const adminEmail = 'admin@marisnails.com';
    const existingAdmin = await userGateway.findByEmail(adminEmail);

    if (existingAdmin) {
        console.log('Admin user already exists.');
    } else {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await userGateway.create({
            email: adminEmail,
            fullName: 'Administrador Principal',
            password: hashedPassword,
            role: UserRole.ADMIN,
        } as any);
        console.log('Admin user created successfully.');
    }

    await app.close();
}

bootstrap();
