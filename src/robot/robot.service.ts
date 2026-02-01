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
   * Aquí NestJS llama al ESP32 vía HTTP.
   */
  async requestDispense(dto: DispenseDto) {
    const baseUrl = process.env.ESP32_URL || 'http://192.168.0.50';

    // 1. Buscar la medicina para saber su SLOT
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });

    if (!medicine || !medicine.slot) {
      throw new InternalServerErrorException('Esta medicina no tiene un carril (slot) asignado en el robot.');
    }

    try {
      // 2. Llamada al ESP32 con el SLOT correcto
      const response$ = this.http.post(`${baseUrl}/dispense`, {
        slot: medicine.slot, // 👈 Enviamos el SLOT físico (1-6)
        amount: dto.amount,
        medicineName: medicine.name // Opcional: para que el robot lo muestre en pantalla
      });

      const response = await firstValueFrom(response$);

      // Guardamos un log simple
      await this.prisma.robotLog.create({
        data: {
          medicineId: dto.medicineId,
          message: `Dispensando Slot ${medicine.slot} (${medicine.name}) - Amount ${dto.amount}`,
        },
      });

      return {
        ok: true,
        fromEsp32: response.data,
      };
    } catch (error) {
      this.logger.error('Error llamando al ESP32 /dispense', error?.message);

      await this.prisma.robotLog.create({
        data: {
          medicineId: dto.medicineId,
          message: `Error al llamar al ESP32: ${error?.message || 'desconocido'}`,
        },
      });

      throw new InternalServerErrorException('No se pudo comunicar con el ESP32');
    }
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
