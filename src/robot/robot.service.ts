import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { DispenseDto } from './dto/dispense.dto';
import { DispenseSlotDto } from './dto/dispense-slot.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { DispensedDto } from './dto/dispensed.dto';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RobotService implements OnModuleInit {
  onModuleInit() {
    console.log('🦾 RobotService initialized');
  }
  private readonly logger = new Logger(RobotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) { }

  /**
   * Tarea automática: Se ejecuta cada minuto para revisar si toca dar alguna pastilla.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const now = new Date();
    // Obtener hora actual en formato HH:mm (ej: 08:30)
    const currentHHmm = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // Obtener día de la semana (LU, MA, MI, JU, VI, SA, DO)
    const dayNames = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
    const currentDay = dayNames[now.getDay()];

    this.logger.debug(`⏰ Chequeando medicinas para las ${currentHHmm} (${currentDay})...`);

    // Buscar todas las medicinas que tengan slot y cuya hora coincida
    const medicinesToDispense = await this.prisma.medicine.findMany({
      where: {
        slot: { not: null },
        time: currentHHmm,
        days: { has: currentDay }
      },
      include: {
        patient: true
      }
    });

    for (const med of medicinesToDispense) {
      if (!med.patient?.robotSerialNumber) continue;

      // Evitar duplicados: Si ya existe una tarea creada en el último minuto para este slot, ignorar
      const oneMinuteAgo = new Date(now.getTime() - 59000);
      const existingTask = await (this.prisma as any).dispensationTask.findFirst({
        where: {
          serialNumber: med.patient.robotSerialNumber,
          slot: med.slot,
          createdAt: { gte: oneMinuteAgo }
        }
      });

      if (existingTask) {
        this.logger.warn(`🚩 Tarea ya creada anteriormente para ${med.name} (Slot ${med.slot})`);
        continue;
      }

      // Crear la tarea para el ESP32
      await (this.prisma as any).dispensationTask.create({
        data: {
          serialNumber: med.patient.robotSerialNumber,
          slot: med.slot,
          status: 'PENDING',
        }
      });

      // Registrar en el log
      await (this.prisma as any).robotLog.create({
        data: {
          medicineId: med.id,
          message: `⏰ AUTO-DISPENSE: Tarea creada para ${med.name} en carril ${med.slot} (${med.patient.name})`,
        }
      });

      this.logger.log(`✅ Tarea automatica generada: ${med.name} (Slot ${med.slot})`);
    }
  }

  /**
   * El ESP32 envía su estado actual (batería, wifi, estado)
   */
  async reportStatus(dto: CreateStatusDto) {
    const state = await (this.prisma as any).robotState.create({
      data: {
        serialNumber: dto.serialNumber, // 👈 Identificar robot
        status: dto.status,
        wifi: dto.wifi,
        batteryPct: dto.batteryPct,
        temperature: dto.temperature,
        uptime: dto.uptime,
        signalStrength: dto.signalStrength,
      },
    });

    return state;
  }

  async getLatestStatus(serialNumber?: string, user?: any) {
    let targetSerial = serialNumber;

    // 🚀 INFERENCIA: Si no hay serial, lo buscamos en los pacientes del usuario
    if (!targetSerial && user) {
      const patientWithRobot = await (this.prisma as any).patient.findFirst({
        where: {
          caregiverId: user.id,
          NOT: [
            { robotSerialNumber: null },
            { robotSerialNumber: "" }
          ]
        },
        select: { robotSerialNumber: true }
      });
      targetSerial = patientWithRobot?.robotSerialNumber;
    }

    if (!targetSerial) return null;

    const state = await (this.prisma as any).robotState.findFirst({
      where: { serialNumber: targetSerial },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!state) return null;

    // 🕒 VERIFICAR SI ESTÁ OFFLINE (más de 15 segundos sin reportar)
    const now = new Date();
    const lastUpdate = new Date(state.updatedAt);
    const secondsSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / 1000;

    if (secondsSinceLastUpdate > 15) {
      return {
        ...state,
        status: 'OFFLINE',
        wifi: false
      };
    }

    return state;
  }

  /**
   * El frontend pide dispensar pastillas.
   * Ahora agregamos la tarea a una COLA (Queue) para que el ESP32 la recoja.
   */
  async requestDispense(dto: DispenseDto, serialNumber: string) {
    // 1. Buscar la medicina para saber su SLOT (posición del carrusel)
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
      include: { patient: true }
    });

    if (!medicine || medicine.slot === null || medicine.slot === undefined) {
      throw new InternalServerErrorException('Esta medicina no tiene un carril (slot) asignado.');
    }

    let targetSerial = serialNumber;
    if (!targetSerial && medicine.patient?.robotSerialNumber) {
      targetSerial = medicine.patient.robotSerialNumber;
    }

    if (!targetSerial) {
      throw new InternalServerErrorException('No se pudo identificar el robot para este paciente.');
    }

    // 2. Crear la tarea en la cola
    const task = await (this.prisma as any).dispensationTask.create({
      data: {
        serialNumber: targetSerial,
        slot: medicine.slot,
        status: 'PENDING',
      },
    });

    // Log del robot
    await (this.prisma as any).robotLog.create({
      data: {
        medicineId: dto.medicineId,
        message: `Orden creada: Mover carrusel a Slot ${medicine.slot} para ${medicine.name}`,
      },
    });

    return {
      ok: true,
      taskId: task.id,
      message: 'Orden enviada al robot con éxito. El robot la procesará en breve.',
    };
  }

  /**
   * Dispensar directamente por carril (slot) sin necesidad de medicina.
   * Útil para pruebas o dispensación manual.
   */
  async requestDispenseSlot(dto: DispenseSlotDto, serialNumber: string) {
    // Crear la tarea en la cola directamente con el slot
    const task = await (this.prisma as any).dispensationTask.create({
      data: {
        serialNumber: serialNumber,
        slot: dto.slot,
        status: 'PENDING',
      },
    });

    // Log del robot
    await (this.prisma as any).robotLog.create({
      data: {
        message: `Dispensación manual: Carril ${dto.slot} activado`,
      },
    });

    return {
      ok: true,
      taskId: task.id,
      message: `Carril ${dto.slot} será dispensado en breve.`,
    };
  }

  /**
   * El ESP32 llama aquí para saber qué tiene que hacer.
   * Retornamos solo la tarea más antigua para facilitar el parseado en C++.
   */
  async getPendingTasks(serialNumber: string) {
    const task = await (this.prisma as any).dispensationTask.findFirst({
      where: {
        serialNumber,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!task) return {}; // Retornar objeto vacío si no hay tareas

    return {
      taskId: task.id,
      slot: task.slot
    };
  }

  /**
   * El ESP32 avisa que terminó una tarea específica.
   */
  async completeTask(taskId: any) {
    const id = typeof taskId === 'string' ? parseInt(taskId) : taskId;
    return (this.prisma as any).dispensationTask.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  /**
   * El ESP32 confirma que ya dispensó las pastillas.
   */
  async confirmDispensed(dto: DispensedDto) {
    const message =
      dto.message ||
      `Robot reporta dispensado medicineId=${dto.medicineId ?? 'N/A'}, amount=${dto.amount ?? 'N/A'}, time=${dto.time ?? 'N/A'}`;

    const log = await (this.prisma as any).robotLog.create({
      data: {
        medicineId: dto.medicineId ?? null,
        message,
      },
    });

    return log;
  }

  /**
   * (Opcional) Listar logs del robot
   */
  async getLogs(limit = 20) {
    return (this.prisma as any).robotLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async getSchedule() {
    // Retorna todas las medicinas que TENGAN un slot asignado
    const medicines = await this.prisma.medicine.findMany({
      where: {
        slot: { not: null }, // Solo las que están cargadas en el robot
      },
      select: {
        id: true,
        name: true,
        slot: true,
        time: true,
        days: true,
        dosage: true,
      },
    });

    return {
      timestamp: new Date().toISOString(),
      schedule: medicines,
    };
  }

  /**
   * Obtener el inventario actual del robot.
   */
  async getInventory(serialNumber: string = 'esp32pastibot') {
    const inventory = await (this.prisma as any).robotInventory.findMany({
      where: { serialNumber },
      orderBy: { slot: 'asc' },
    });

    return inventory;
  }

  /**
   * Actualizar el inventario de un carril específico.
   */
  async updateInventorySlot(dto: UpdateInventoryDto, serialNumber: string = 'esp32pastibot') {
    const inventory = await (this.prisma as any).robotInventory.upsert({
      where: {
        serialNumber_slot: {
          serialNumber,
          slot: dto.slot,
        },
      },
      update: {
        medicineName: dto.medicineName,
      },
      create: {
        serialNumber,
        slot: dto.slot,
        medicineName: dto.medicineName,
      },
    });

    return {
      ok: true,
      message: `Carril ${dto.slot} actualizado con ${dto.medicineName}`,
      inventory,
    };
  }
}
