import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) { }



  private generateLinkCode(): string {
    return randomBytes(3).toString('hex').toUpperCase(); // 6 caracteres
  }

  // 1️⃣ Encontrar cuidador por su código y listar sus ranuras de pacientes
  async findCaregiverByCode(code: string) {
    const caregiver = await (this.prisma.user as any).findUnique({
      where: { sharingCode: code.toUpperCase() },
      include: {
        patients: {
          where: { userId: null } // Solo ranuras no vinculadas
        }
      }
    });

    if (!caregiver) {
      throw new NotFoundException('Código de cuidador no encontrado');
    }

    return {
      id: caregiver.id,
      name: caregiver.name,
      availableSlots: caregiver.patients
    };
  }

  // 2️⃣ Vincular a un paciente específico escogido de la lista
  async linkToPatient(userId: number, patientId: number) {
    const patient = await (this.prisma.patient as any).findUnique({
      where: { id: patientId }
    });

    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (patient.userId) throw new BadRequestException('Esta ranura ya está ocupada');

    return (this.prisma.patient as any).update({
      where: { id: patientId },
      data: { userId }
    });
  }

  // 🚀 VINCULACIÓN PRO: El paciente crea su perfil automáticamente al poner el código del cuidador
  async linkByCode(userId: number, code: string) {
    const codeUpper = code.toUpperCase();
    console.log(`[LINKING] Intento de vinculación: User ${userId} con Código: ${codeUpper}`);

    // 1️⃣ Buscar al cuidador por su código maestro
    const caregiver = await (this.prisma.user as any).findUnique({
      where: { sharingCode: codeUpper },
      include: { patients: true }
    });

    if (!caregiver) {
      console.error(`[LINKING ERROR] Código no encontrado: ${codeUpper}`);
      throw new NotFoundException('Código de cuidador no encontrado. Verifica con tu cuidador.');
    }

    console.log(`[LINKING] Cuidador encontrado: ${caregiver.name} (ID: ${caregiver.id})`);

    // 2️⃣ Verificar límite de pacientes (Máximo 2)
    if (caregiver.patients.length >= 2) {
      console.error(`[LINKING ERROR] Límite de pacientes alcanzado para Cuidador ${caregiver.id}`);
      throw new BadRequestException('Lo sentimos, este cuidador ya tiene el cupo de pacientes lleno.');
    }

    // 3️⃣ Obtener datos del usuario (paciente) para crear su perfil
    const user = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      include: { patientProfile: true }
    });

    // 🐛 CHANGE: Si ya existe perfil, LO ACTUALIZAMOS en lugar de fallar
    if (user.patientProfile) {
      console.log(`[LINKING FIX] Usuario ${userId} ya tiene perfil. Actualizando cuidador a ${caregiver.id}`);
      return (this.prisma.patient as any).update({
        where: { id: user.patientProfile.id },
        data: { caregiverId: caregiver.id }
      });
    }

    console.log(`[LINKING SUCCESS] Creando perfil para ${user.name} bajo el mando de ${caregiver.name}`);

    // 4️⃣ Crear el registro de Patient automáticamente
    return (this.prisma.patient as any).create({
      data: {
        name: user.name,
        userId: user.id,
        caregiverId: caregiver.id,
        gender: user.gender,
      },
    });
  }

  // Desactivamos o simplificamos la creación manual desde el cuidador
  async create(caregiverId: number, dto: CreatePatientDto) {
    throw new BadRequestException('El registro manual está desactivado. Comparte tu código con el paciente para vincularlo.');
  }

  async findAllForCaregiver(caregiverId: number) {
    return (this.prisma.patient as any).findMany({
      where: { caregiverId },
      include: {
        medicines: true,
        user: {
          select: {
            photoUrl: true,
          }
        }
      },
    });
  }

  async updatePatientOwnProfile(userId: number, dto: UpdatePatientDto) {
    let patient = await (this.prisma.patient as any).findUnique({
      where: { userId }
    });

    // Si no existe, lo creamos (UPSERT lógico) para soportar usuarios de Google
    if (!patient) {
      console.log(`[PROFILE FIX] Creando perfil de paciente faltante para User ${userId}`);

      const user = await (this.prisma.user as any).findUnique({
        where: { id: userId }
      });

      if (!user) throw new NotFoundException('Usuario no encontrado');

      // Creamos el perfil de paciente
      // Nota: No tendrá cuidador asignado (caregiverId: null) hasta que se vincule
      patient = await (this.prisma.patient as any).create({
        data: {
          userId: user.id,
          name: dto.name || user.name, // Usar nombre del DTO o del usuario
          email: user.email,
          gender: dto.gender || user.gender,
          age: dto.age,
          condition: dto.condition,
          emergencyPhone: dto.emergencyPhone
        }
      });

      // Si se envió género, actualizamos también al usuario base
      if (dto.gender && dto.gender !== user.gender) {
        await (this.prisma.user as any).update({
          where: { id: userId },
          data: { gender: dto.gender }
        });
      }

      return patient;
    }

    // Si ya existía, actualización normal

    // 🛡️ PROTECT: Separate caregiverCode from primitive fields to avoid Prisma error
    const { ...cleanDto } = dto as any;
    delete cleanDto.caregiverCode;

    // Handle caregiverCode manually if provided
    let extraData = {};
    if ((dto as any).caregiverCode) {
      const code = (dto as any).caregiverCode.toUpperCase();
      const caregiver = await (this.prisma.user as any).findUnique({ where: { sharingCode: code } });
      if (caregiver) {
        extraData = { caregiverId: caregiver.id };
      }
    }

    const updatedPatient = await (this.prisma.patient as any).update({
      where: { id: patient.id },
      data: {
        ...cleanDto,
        ...extraData
      },
    });

    // También actualizamos el género en el User si viene en el DTO
    if (dto.gender) {
      await (this.prisma.user as any).update({
        where: { id: userId },
        data: { gender: dto.gender }
      });
    }

    return updatedPatient;
  }

  async findOneForCaregiver(caregiverId: number, id: number) {
    const patient = await (this.prisma.patient as any).findFirst({
      where: {
        id,
        caregiverId,
      },
      include: {
        medicines: true,
        user: {
          select: {
            photoUrl: true,
            bio: true,
          }
        },
        caregiver: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          }
        }
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    return patient;
  }

  async update(caregiverId: number, id: number, dto: UpdatePatientDto) {
    // Revisa primero que sea del cuidador
    await this.findOneForCaregiver(caregiverId, id);

    return (this.prisma.patient as any).update({
      where: { id },
      data: dto,
    });
  }

  async remove(caregiverId: number, id: number) {
    // Revisa primero que sea del cuidador
    await this.findOneForCaregiver(caregiverId, id);

    return (this.prisma.patient as any).delete({
      where: { id },
    });
  }

  async getPatientHistory(caregiverId: number, patientId: number, days: number = 7) {
    // Verificar que el paciente pertenece al cuidador
    await this.findOneForCaregiver(caregiverId, patientId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Obtener medicinas del paciente
    const medicines = await (this.prisma.medicine as any).findMany({
      where: { patientId },
      select: { id: true }
    });

    const medicineIds = medicines.map((m: any) => m.id);

    // Si no hay medicinas, retornar array vacío
    if (medicineIds.length === 0) {
      return [];
    }

    // Buscar historial de dispensación usando el nombre correcto: dispensationLog
    const history = await (this.prisma.dispensationLog as any).findMany({
      where: {
        medicineId: { in: medicineIds },
        dispensedAt: { gte: startDate }
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            dosage: true
          }
        }
      },
      orderBy: { dispensedAt: 'desc' }
    });

    return history;
  }

  async getPatientReminders(caregiverId: number, patientId: number) {
    // Verificar que el paciente pertenece al cuidador
    await this.findOneForCaregiver(caregiverId, patientId);

    // Obtener recordatorios usando el campo 'time'
    const reminders = await (this.prisma.reminder as any).findMany({
      where: {
        medicine: {
          patientId: patientId
        }
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            dosage: true
          }
        }
      },
      orderBy: { time: 'asc' },
      take: 10
    });

    return reminders.map((r: any) => ({
      ...r,
      medicineName: r.medicine?.name || 'Medicina'
    }));
  }
}
