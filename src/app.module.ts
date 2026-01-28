import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Prisma (base de datos)
import { PrismaModule } from './prisma/prisma.module';

// Controladores base del sistema
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Módulos funcionales
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { MedicinesModule } from './medicines/medicines.module';
import { RemindersModule } from './reminders/reminders.module';
import { RobotModule } from './robot/robot.module';
import { InvitationsModule } from './invitations/invitations.module';

@Module({
  imports: [
    // Base de datos y Prisma
    PrismaModule,

    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Autenticación (login, registro, OAuth, JWT)
    AuthModule,

    // Usuarios (perfil, actualizar usuario)
    UsersModule,

    // Pacientes (CRUD)
    PatientsModule,

    // Medicinas (CRUD)
    MedicinesModule,

    // Recordatorios
    RemindersModule,

    // Robot
    RobotModule,

    // Invitaciones (agregado)
    InvitationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
