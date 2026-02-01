import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { DispenseDto } from './dto/dispense.dto';
import { DispensedDto } from './dto/dispensed.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RobotService {
  private readonly logger = new Logger(RobotService.name);

  constructor(
    private prisma: PrismaService,
    private http: HttpService,
  ) { }

  /**
   * El ESP32 envía su estado actual (batería, wifi, estado)
   */
  async reportStatus(dto: CreateStatusDto) {
    const state = await this.prisma.robotState.create({
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

  /**
   * Devuelve el último estado conocido de UN robot específico
   */
  async getLatestStatus(serialNumber: string) {
    if (!serialNumber) return null;

    const state = await this.prisma.robotState.findFirst({
      where: { serialNumber },
      orderBy: {
        updatedAt: 'desc',
      },
    });

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
    });

    if (!medicine || medicine.slot === null || medicine.slot === undefined) {
      throw new InternalServerErrorException('Esta medicina no tiene un carril (slot) asignado.');
    }

    // 2. Crear la tarea en la cola
    const task = await this.prisma.dispensationTask.create({
      data: {
        serialNumber: serialNumber,
        slot: medicine.slot,
        status: 'PENDING',
      },
    });

    // Log del robot
    await this.prisma.robotLog.create({
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

    const log = await this.prisma.robotLog.create({
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
    return this.prisma.robotLog.findMany({
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
}
