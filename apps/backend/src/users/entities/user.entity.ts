import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Este enum define los roles permitidos en tu academia
export enum UserRole {
    ADMIN = 'admin',
    STUDENT = 'student',
}

@Entity('users') // Esto le dice a TypeORM que cree una tabla llamada "users"
export class User {
    @PrimaryGeneratedColumn('uuid') // Un ID alfanumérico único, más seguro que 1, 2, 3...
    id: string;

    @Column({ unique: true }) // No pueden haber dos alumnos con el mismo correo
    email: string;

    @Column() // Aquí guardaremos la contraseña (¡encriptada más adelante!)
    password: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.STUDENT, // Por defecto, el que se registre será estudiante
    })
    role: UserRole;

    @CreateDateColumn() // Guarda automáticamente la fecha y hora en que se registró
    createdAt: Date;
}