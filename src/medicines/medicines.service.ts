import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

import { FirebaseService } from '../auth/firebase.service';

@Injectable()
export class MedicinesService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService
  ) { }

  // -------------------------------
  // Crear medicina para un paciente
  // -------------------------------
  async createForPatient(
    caregiverId: number,
    patientId: number,
    dto: CreateMedicineDto,
  ) {
    // ✅ VALIDACIÓN REAL
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        caregiverId: caregiverId,
      },
    });

    if (!patient) {
      throw new BadRequestException(
        'Paciente no existe o no pertenece a este cuidador',
      );
    }

    // ✅ Crear medicina con recordatorios en transacción
    const times = dto.times || (dto.time ? [dto.time] : []);

    const result = await this.prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.create({
        data: {
          name: dto.name,
          dosage: dto.dosage,
          stock: dto.stock ?? 0,
          qrData: dto.qrData ?? null,
          time: times[0] || null, // Guardamos el primero como referencia
          days: dto.days ?? [],
          label: dto.label ?? null,
          slot: dto.slot ?? null,
          icon: dto.icon ?? 'medkit',
          instructions: dto.instructions ?? '',
          category: dto.category ?? 'General',
          stockAlert: dto.stockAlert ?? 5,
          imageUrls: dto.imageUrls ?? [],
          patientId: patient.id,
          caregiverId: caregiverId,
        } as any,
      });

      // Crear los recordatorios individuales
      if (times.length > 0) {
        await tx.reminder.createMany({
          data: times.map(t => ({
            time: t,
            days: (dto.days ?? []).join(','),
            label: dto.label ?? `Toma de ${dto.name}`,
            medicineId: medicine.id,
          })),
        });
      }

      return tx.medicine.findUnique({
        where: { id: medicine.id },
        include: { reminders: true },
      });
    });

    // 🚀 NOTIFICAR AL PACIENTE
    if (result && patient.userId) {
      this.notifyPatient(patient.userId, dto.name, caregiverId);
    }

    return result;
  }

  // 🔔 Helper para notificar
  async notifyPatient(userId: number, medicineName: string, caregiverId: number) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const caregiver = await this.prisma.user.findUnique({ where: { id: caregiverId } });

      if ((user as any)?.fcmToken) {
        await this.firebaseService.sendPushNotification(
          (user as any).fcmToken,
          "📋 Nueva Receta Actualizada",
          `Tu cuidador ${caregiver?.name || 'Pastibot'} ha agregado ${medicineName} a tu calendario.`
        );
      }
    } catch (e) {
      console.error("Error enviando notificación push:", e);
    }
  }

  // -------------------------------
  // Obtener medicinas
  // -------------------------------
  async findAllForPatient(caregiverId: number, patientId: number) {
    return this.prisma.medicine.findMany({
      where: { patientId, caregiverId },
      include: { reminders: true },
    });
  }

  async findOne(caregiverId: number, id: number) {
    const med = await this.prisma.medicine.findFirst({
      where: { id, caregiverId },
      include: { reminders: true },
    });

    if (!med) {
      throw new NotFoundException('Medicamento no encontrado');
    }

    return med;
  }

  async update(caregiverId: number, id: number, dto: UpdateMedicineDto) {
    const existing = await this.findOne(caregiverId, id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar medicina
      const { times, ...data } = dto;
      const medicine = await tx.medicine.update({
        where: { id },
        data: {
          ...data,
          time: times && times.length > 0 ? times[0] : existing.time,
        } as any,
      });

      // 2. Si hay nuevos horarios, refrescar recordatorios
      if (times) {
        // Borrar actuales
        await tx.reminder.deleteMany({ where: { medicineId: id } });

        // Crear nuevos
        if (times.length > 0) {
          await tx.reminder.createMany({
            data: times.map(t => ({
              time: t,
              days: (dto.days || existing.days).join(','),
              label: dto.label || existing.label || `Toma de ${medicine.name}`,
              medicineId: id,
            })),
          });
        }
      }

      return tx.medicine.findUnique({
        where: { id },
        include: { reminders: true },
      });
    });
  }

  async remove(caregiverId: number, id: number) {
    await this.findOne(caregiverId, id);

    // 🔥 PRIMERO: Eliminar todos los recordatorios asociados
    await this.prisma.reminder.deleteMany({
      where: { medicineId: id },
    });

    // 🔥 SEGUNDO: Eliminar los logs de dispensación (evita error de FK)
    await (this.prisma as any).dispensationLog.deleteMany({
      where: { medicineId: id },
    });

    // 🔥 TERCERO: Eliminar la medicina
    return this.prisma.medicine.delete({
      where: { id },
    });
  }
}
