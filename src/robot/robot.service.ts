import { BadRequestException, Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { DispenseDto } from './dto/dispense.dto';
import { DispenseSlotDto } from './dto/dispense-slot.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { DispensedDto } from './dto/dispensed.dto';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RobotGateway } from './robot.gateway';

@Injectable()
export class RobotService implements OnModuleInit {
  async onModuleInit() {
    this.logger.log('🦾 RobotService initialized - Versión 2.1 (Heartbeat Fix)');
    try {
      await (this.prisma as any).robotLog.create({
        data: { message: '🚀 SERVICIO INICIADO: El sistema cron está arrancando...' }
      });
    } catch (e) {
      console.error('Error in onModuleInit log:', e);
    }
  }
  private readonly logger = new Logger(RobotService.name);
  private statusCache = new Map<string, any>(); // ⚡ Memoria cache para estados

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly robotGateway: RobotGateway,
  ) { }

  /**
   * Tarea automática: Se ejecuta cada minuto para revisar si toca dar alguna pastilla.
   */
  @Cron('* * * * *')
  async handleCron() {
    const now = new Date();
    const localDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));

    const hours = String(localDate.getUTCHours()).padStart(2, '0');
    const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
    const currentHHmm = `${hours}:${minutes}`;

    const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    const currentDay = dayNames[localDate.getUTCDay()];

    // 🔍 BUSCAR TODO LO DE ESTA HORA (Luego filtramos por día en JS)
    const candidates = await this.prisma.reminder.findMany({
      where: {
        active: true,
        time: currentHHmm
      },
      include: {
        medicine: {
          include: { patient: true }
        }
      }
    });

    if (candidates.length > 0) {
      await (this.prisma as any).robotLog.create({
        data: { message: `🔔 CRON: ${candidates.length} candidatas para las ${currentHHmm}. Chequeando día ${currentDay}...` }
      });
    } else {
      // HEARTBEAT LOG cada 10 min
      if (localDate.getUTCMinutes() % 10 === 0) {
        await (this.prisma as any).robotLog.create({
          data: { message: `🔍 CRON BEAT: ${currentHHmm} (${currentDay}) - No hay nada ahora.` }
        });
      }
    }

    // Filtrar por día manualmente (más robusto)
    const activeReminders = candidates.filter(r => {
      if (!r.days) return false;
      const daysArr = r.days.split(',').map(d => d.trim().toLowerCase());
      return daysArr.includes(currentDay.toLowerCase());
    });

    if (activeReminders.length > 0) {
      await (this.prisma as any).robotLog.create({
        data: { message: `🎯 CRON MATCH: ${activeReminders.length} recordatorios coinciden con día y hora.` }
      });
    }

    for (const reminder of activeReminders) {
      const med = reminder.medicine;
      if (!med || !med.slot || !med.patient?.robotSerialNumber) {
        await (this.prisma as any).robotLog.create({
          data: { message: `⚠️ SKIP: Medicina ${med?.name || 'ID ' + reminder.medicineId} ignorada. Slot: ${med?.slot}, Serial: ${med?.patient?.robotSerialNumber}` }
        });
        continue;
      }

      const serial = med.patient.robotSerialNumber.trim();

      // Evitar duplicados: Si ya existe una tarea creada en el último minuto para este slot, ignorar
      const oneMinuteAgo = new Date(now.getTime() - 59000);
      const existingTask = await (this.prisma as any).dispensationTask.findFirst({
        where: {
          serialNumber: serial,
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
          serialNumber: serial,
          slot: med.slot,
          medicineId: med.id,    // 👈 Guardar ID
          patientId: med.patientId, // 👈 Guardar ID
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

      this.logger.log(`✅ Tarea automática generada: ${med.name} (Slot ${med.slot}) para robot ${serial}`);

      this.robotGateway.broadcastTaskUpdate(serial, {
        type: 'AUTO_DISPENSE',
        medicine: med.name,
        slot: med.slot,
        status: 'PENDING'
      });
    }
  }

  /**
   * 🕒 LOGICA DE TIMEOUT (3 MINUTOS)
   * Revisa tareas PENDING o PROCESSING muy antiguas y las marca como OMITIDAS. 
   */
  @Cron('*/1 * * * *') // Cada minuto
  async handleTimeouts() {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const expiredTasks = await (this.prisma as any).dispensationTask.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { lt: threeMinutesAgo }
      }
    });

    for (const task of expiredTasks) {
      await (this.prisma as any).dispensationTask.update({
        where: { id: task.id },
        data: { status: 'OMITTED' }
      });

      if (task.medicineId) {
        // Registrar en el historial como MISSED
        await (this.prisma as any).dispensationLog.create({
          data: {
            medicineId: task.medicineId,
            patientId: task.patientId,
            status: 'MISSED',
            dispensedAt: new Date()
          }
        });

        await (this.prisma as any).robotLog.create({
          data: {
            medicineId: task.medicineId,
            message: `⚠️ TIMEOUT: Dosis omitida (3 min sin respuesta) para slot ${task.slot}`,
          }
        });
      }

      // Notificar al front
      this.robotGateway.broadcastTaskUpdate(task.serialNumber, {
        taskId: task.id,
        status: 'OMITTED'
      });
    }
  }

  /**
   * El ESP32 envía su estado actual (batería, wifi, estado)
   */
  async reportStatus(dto: CreateStatusDto) {
    console.log(`[ROBOT] Recibido estado de ${dto.serialNumber}:`, dto);
    const data = {
      serialNumber: dto.serialNumber,
      status: dto.status,
      wifi: dto.wifi,
      batteryPct: dto.batteryPct,
      temperature: dto.temperature,
      uptime: dto.uptime ? String(dto.uptime) : null,
      signalStrength: dto.signalStrength,
      updatedAt: new Date()
    };

    // ⚡ ACTUALIZAR CACHE DE MEMORIA (INSTANTÁNEO)
    this.statusCache.set(dto.serialNumber, {
      ...data,
      id: 0, // Mock id
    });

    // Guardar en DB en segundo plano (sin esperar)
    this.prisma.robotState.create({ data }).catch(e => this.logger.error("Error saving state:", e));

    // 🚀 NOTIFICAR AL FRONTEND VIA WEBSOCKETS
    this.robotGateway.broadcastStatusUpdate(dto.serialNumber, data);

    return data;
  }

  async getLatestStatus(serialNumber?: string, user?: any) {
    let targetSerial = serialNumber;

    // 🚀 INFERENCIA SILENCIOSA: Si no hay serial, lo buscamos en los pacientes del usuario
    if (!targetSerial && user) {
      // 1. Si es CUIDADOR, busca su primer paciente con robot
      const patientWithRobot = await (this.prisma as any).patient.findFirst({
        where: {
          OR: [
            { caregiverId: user.id },
            { userId: user.id }
          ],
          NOT: [
            { robotSerialNumber: null },
            { robotSerialNumber: "" }
          ]
        },
        select: { robotSerialNumber: true }
      });
      targetSerial = patientWithRobot?.robotSerialNumber;

      // 2. ABSOLUTE FALLBACK: Si aún no hay serial, busca el ÚLTIMO robot activo en todo el sistema
      if (!targetSerial) {
        const lastKnownGlobal = await (this.prisma as any).robotState.findFirst({
          orderBy: { updatedAt: 'desc' },
          select: { serialNumber: true }
        });
        targetSerial = lastKnownGlobal?.serialNumber;
      }
    }

    if (!targetSerial) return null;

    // ⚡ INTENTAR CARGAR DE CACHE PRIMERO
    let state = this.statusCache.get(targetSerial);

    if (!state) {
      state = await (this.prisma as any).robotState.findFirst({
        where: { serialNumber: targetSerial },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      if (state) this.statusCache.set(targetSerial, state);
    }

    if (!state) return null;

    // 🕒 VERIFICAR SI ESTÁ OFFLINE (más de 30 segundos sin reportar)
    const now = new Date();
    const lastUpdate = new Date(state.updatedAt);
    const secondsSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / 1000;

    if (secondsSinceLastUpdate > 30) {
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
      throw new BadRequestException(`La medicina '${medicine?.name || 'desconocida'}' no tiene un carril (slot) asignado en el robot.`);
    }

    let targetSerial = serialNumber;
    if (!targetSerial && medicine.patient?.robotSerialNumber) {
      targetSerial = medicine.patient.robotSerialNumber;
    }

    if (!targetSerial) {
      targetSerial = 'esp32pastibot'; // 🚀 Fallback de emergencia para que funcione sin configuración manual
      console.log(`[ROBOT] Usando serial por defecto 'esp32pastibot' para medicina ${dto.medicineId}`);
    }

    // 2. Crear la tarea en la cola
    const task = await (this.prisma as any).dispensationTask.create({
      data: {
        serialNumber: targetSerial,
        slot: medicine.slot,
        medicineId: dto.medicineId,  // 👈 Guardar ID
        patientId: medicine.patientId, // 👈 Guardar ID
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

    // 🚀 NOTIFICAR AL FRONTEND VIA WEBSOCKETS
    this.robotGateway.broadcastTaskUpdate(targetSerial, {
      type: 'MANUAL_DISPENSE',
      medicine: medicine.name,
      slot: medicine.slot,
      status: 'PENDING',
      taskId: task.id
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
    const targetSerial = serialNumber || 'esp32pastibot';
    // Crear la tarea en la cola directamente con el slot
    const task = await (this.prisma as any).dispensationTask.create({
      data: {
        serialNumber: targetSerial,
        slot: dto.slot,
        status: 'PENDING',
      },
    });

    // Log del robot
    await (this.prisma as any).robotLog.create({
      data: {
        message: `🤖 MANUAL-SLOT: Carril ${dto.slot} activado para robot ${targetSerial}`,
      },
    });

    // 🚀 NOTIFICAR AL FRONTEND VIA WEBSOCKETS
    this.robotGateway.broadcastTaskUpdate(targetSerial, {
      type: 'SLOT_DISPENSE',
      slot: dto.slot,
      status: 'PENDING',
      taskId: task.id
    });

    return {
      ok: true,
      taskId: task.id,
      message: `Carril ${dto.slot} del robot ${targetSerial} será dispensado en breve.`,
    };
  }

  /**
   * El ESP32 llama aquí para saber qué tiene que hacer.
   * Retornamos solo la tarea más antigua para facilitar el parseado en C++.
   */
  async getPendingTasks(serialNumber: string) {
    // 1. Buscar la tarea más antigua que esté PENDING
    const task = await (this.prisma as any).dispensationTask.findFirst({
      where: {
        serialNumber,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!task) return {}; // Retornar objeto vacío si no hay tareas

    // 2. 🛡️ IMPORTANTE: Marcarla como 'PROCESSING' inmediatamente
    // Esto evita que si el ESP32 se resetea por una caída de tensión (brownout),
    // vuelva a pedir la misma tarea y dispense dos veces.
    await (this.prisma as any).dispensationTask.update({
      where: { id: task.id },
      data: { status: 'PROCESSING' }
    });

    // Notificar al frontend que el robot empezó a trabajar
    this.robotGateway.broadcastTaskUpdate(serialNumber, {
      taskId: task.id,
      status: 'PROCESSING',
      slot: task.slot
    });

    // 3. Intentar obtener el nombre del paciente para que el ESP32 lo muestre en el LCD
    let patientName = "Paciente";
    let inventory: any = null;
    try {
      inventory = await (this.prisma as any).robotInventory.findUnique({
        where: { serialNumber_slot: { serialNumber, slot: task.slot } }
      });

      if (inventory) {
        const medicine = await this.prisma.medicine.findFirst({
          where: {
            name: { equals: inventory.medicineName, mode: 'insensitive' },
            patient: { robotSerialNumber: serialNumber }
          },
          include: { patient: true }
        });
        if (medicine?.patient?.name) {
          patientName = medicine.patient.name.split(' ')[0]; // Solo primer nombre para el LCD
          await (this.prisma as any).robotLog.create({
            data: { message: `🔍 LOOKUP OK: Slot ${task.slot} -> ${inventory.medicineName} -> Paciente: ${patientName}` }
          });
        } else {
          await (this.prisma as any).robotLog.create({
            data: { message: `⚠️ LOOKUP FAIL: No se halló medicina '${inventory.medicineName}' para robot ${serialNumber}` }
          });
        }
      }
    } catch (e) {
      this.logger.error("Error buscando paciente para tarea:", e);
    }

    return {
      taskId: task.id,
      slot: task.slot,
      patient: patientName,
      medication: inventory?.medicineName || "Medicina"
    };
  }

  /**
   * El ESP32 avisa que terminó una tarea específica.
   */
  async completeTask(taskId: any) {
    const id = typeof taskId === 'string' ? parseInt(taskId) : taskId;
    const completedTask = await (this.prisma as any).dispensationTask.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    // 📝 Crear Log de historial exitoso para el monitoreo
    if (completedTask.medicineId) {
      await (this.prisma as any).dispensationLog.create({
        data: {
          medicineId: completedTask.medicineId,
          patientId: completedTask.patientId,
          status: 'TAKEN', // O 'DISPENSED'
          dispensedAt: new Date()
        }
      });
    }

    const res = completedTask;

    // 🚀 NOTIFICAR AL FRONTEND VIA WEBSOCKETS
    this.robotGateway.broadcastTaskUpdate(res.serialNumber, {
      taskId: res.id,
      status: 'COMPLETED'
    });

    return res;
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
