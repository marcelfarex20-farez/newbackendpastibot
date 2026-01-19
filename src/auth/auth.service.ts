import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) { }

  // ===============================
  // REGISTER LOCAL
  // ===============================
  async registerLocal(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) throw new ConflictException('El correo ya está registrado');

    // 🔒 BLOQUEO DE SEGURIDAD: Solo puede existir el cuidador definido por Seed
    if (dto.role === 'CUIDADOR') {
      throw new UnauthorizedException('El registro de nuevos cuidadores está desactivado. Usa las credenciales por defecto.');
    }

    // 🛡️ REQUISITO PARA PACIENTES: Deben tener un código de cuidador
    let caregiver: any = null;
    if (dto.role === 'PACIENTE') {
      if (!dto.caregiverCode) {
        throw new ConflictException('Los pacientes deben proporcionar un código de cuidador para registrarse.');
      }

      caregiver = await (this.prisma.user as any).findUnique({
        where: { sharingCode: dto.caregiverCode.toUpperCase() },
        include: { patients: true }
      });

      if (!caregiver) {
        throw new ConflictException('El código de cuidador ingresado no es válido.');
      }

      if (caregiver.patients.length >= 2) {
        throw new ConflictException('Este cuidador ya tiene el límite de pacientes alcanzado (Máximo 2).');
      }
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        provider: 'email',
        verified: true,
        role: dto.role,
        gender: dto.gender,
      },
    });

    // 🔗 VINCULACIÓN AUTOMÁTICA SI ES PACIENTE
    if (dto.role === 'PACIENTE' && caregiver) {
      await (this.prisma.patient as any).create({
        data: {
          name: user.name,
          userId: user.id,
          caregiverId: caregiver.id,
          gender: user.gender,
        },
      });
    }

    return await this.buildAuthResponse(user);
  }

  // ===============================
  // LOGIN LOCAL
  // ===============================
  async loginLocal(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    if (!user.password) {
      throw new UnauthorizedException(
        'Tu cuenta fue creada con redes sociales. Debes crear una contraseña.'
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return await this.buildAuthResponse(user);
  }

  // ===============================
  // LOGIN SOCIAL
  // ===============================
  async loginFromOAuth(user: User) {
    return await this.buildAuthResponse(user);
  }

  // ===============================
  // SET PASSWORD
  // ===============================
  async setPassword(userId: number, newPassword: string) {
    if (!userId) {
      throw new UnauthorizedException('No se pudo identificar al usuario.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        provider: 'email',
        verified: true,
      },
    });

    return await this.buildAuthResponse(updated);
  }

  // ===============================
  // SET ROLE
  // ===============================
  async setRole(userId: number, role: Role) {
    if (role === 'CUIDADOR') {
      throw new UnauthorizedException('No puedes asignarte el rol de cuidador.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return await this.buildAuthResponse(updated);
  }

  // ===============================
  // FORGOT PASSWORD
  // ===============================
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // No revelamos si el email existe o no por seguridad
      return { message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' };
    }

    // Generar token único
    const token = this.generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.prisma.passwordReset.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';
    const resetLink = `${frontendUrl}/reset-password/${token}`;

    return {
      message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
      // En desarrollo, devolvemos el link para testing
      resetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
    };
  }

  // ===============================
  // RESET PASSWORD
  // ===============================
  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (reset.used) {
      throw new UnauthorizedException('Este enlace ya fue utilizado');
    }

    if (new Date() > reset.expiresAt) {
      throw new UnauthorizedException('El enlace ha expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: reset.email },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used: true },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  private generateResetToken(): string {
    return [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
  }

  // ===============================
  // TOKEN + RESPUESTA
  // ===============================
  private async buildAuthResponse(user: any) {
    // Recargar el usuario con relaciones necesarias para el frontend
    const fullUser = await (this.prisma.user as any).findUnique({
      where: { id: user.id },
      include: { patientProfile: true }
    });

    if (!fullUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // 🚀 GENERAR CÓDIGO DE CUIDADOR SI NO TIENE
    if (fullUser.role === 'CUIDADOR' && !fullUser.sharingCode) {
      const newCode = Array.from(Array(6), () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
      const updatedUser = await (this.prisma.user as any).update({
        where: { id: fullUser.id },
        data: { sharingCode: newCode },
        include: { patientProfile: true }
      });
      return {
        accessToken: this.signToken(updatedUser),
        user: updatedUser,
      };
    }

    return {
      accessToken: this.signToken(fullUser),
      user: fullUser,
    };
  }

  private signToken(user: User) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
    });
  }
}
