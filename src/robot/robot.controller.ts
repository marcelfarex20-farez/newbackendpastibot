import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  OnModuleInit,
} from '@nestjs/common';
import { RobotService } from './robot.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { DispenseDto } from './dto/dispense.dto';
import { DispenseSlotDto } from './dto/dispense-slot.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { DispensedDto } from './dto/dispensed.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('robot')
export class RobotController implements OnModuleInit {
  onModuleInit() {
    console.log('🤖 RobotController initialized via onModuleInit');
  }
  constructor(private readonly robotService: RobotService) {
    console.log('🤖 RobotController initialized via constructor');
  }

  /**
   * [ESP32 → Backend]
   * El ESP32 manda su estado (OK / DISPENSANDO / ERROR, wifi, batería)
   * NO protegemos con JWT, pero podrías añadir un token simple en cabecera si quieres.
   */
  @Post('status')
  reportStatus(@Body() dto: CreateStatusDto) {
    return this.robotService.reportStatus(dto);
  }

  /**
   * [Frontend → Backend]
   * Obtener el último estado del robot.
   * Protegido con JWT porque lo consulta la app.
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getLatestStatus(@Request() req, @Query('serialNumber') serialNumber: string) {
    return this.robotService.getLatestStatus(serialNumber, req.user);
  }

  /**
   * [Frontend → Backend → ESP32]
   * Pedir que el robot dispense pastillas.
   * La app llama aquí, y aquí se llama al ESP32.
   */
  @UseGuards(JwtAuthGuard)
  @Post('dispense')
  requestDispense(@Body() dto: DispenseDto, @Query('serialNumber') serialNumber: string) {
    return this.robotService.requestDispense(dto, serialNumber);
  }

  /**
   * [Frontend → Backend → ESP32]
   * Dispensar directamente por carril (slot) sin necesidad de medicina.
   */
  @UseGuards(JwtAuthGuard)
  @Post('dispense-slot')
  requestDispenseSlot(@Body() dto: DispenseSlotDto, @Query('serialNumber') serialNumber: string) {
    return this.robotService.requestDispenseSlot(dto, serialNumber);
  }

  /**
   * [ESP32 → Backend]
   * El ESP32 confirma que ya dispensó.
   */
  @Post('dispensed')
  confirmDispensed(@Body() dto: DispensedDto) {
    return this.robotService.confirmDispensed(dto);
  }

  /**
   * (Opcional) Ver últimos logs del robot.
   * Útil para debug en la app o en un panel admin.
   */
  @UseGuards(JwtAuthGuard)
  @Get('logs')
  getLogs(@Query('limit') limit?: string) {
    const n = limit ? Number(limit) : 20;
    return this.robotService.getLogs(n);
  }

  /**
   * [ESP32 → Backend]
   * El Robot pide sus TAREAS PENDIENTES.
   */
  @Get('tasks')
  getPendingTasks(@Query('serialNumber') serialNumber: string) {
    return this.robotService.getPendingTasks(serialNumber);
  }

  /**
   * [ESP32 → Backend]
   * El Robot confirma que terminó una tarea.
   */
  @Post('tasks/complete')
  completeTask(@Body('taskId') taskId: number) {
    return this.robotService.completeTask(taskId);
  }

  /**
   * [ESP32 → Backend]
   * El Robot pide su HORARIO para guardarlo en memoria (Offline First).
   * Devuelve: [{ slot: 1, time: "08:00", dosage: "1 pastilla" }, ...]
   */
  @Get('schedule')
  getSchedule() {
    return this.robotService.getSchedule();
  }

  /**
   * [Frontend → Backend]
   * Obtener el inventario actual del robot (qué medicina está en cada carril).
   */
  @UseGuards(JwtAuthGuard)
  @Get('inventory')
  getInventory(@Query('serialNumber') serialNumber: string) {
    return this.robotService.getInventory(serialNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Post('inventory')
  updateInventory(@Body() dto: UpdateInventoryDto, @Query('serialNumber') serialNumber: string) {
    return this.robotService.updateInventorySlot(dto, serialNumber);
  }
}
