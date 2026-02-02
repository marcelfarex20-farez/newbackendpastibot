import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) { }

  @Post()
  create(@Req() req: any, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(req.user.id, dto);
  }

  @Post('link')
  link(@Req() req: any, @Body('code') code: string) {
    return this.patientsService.linkByCode(req.user.id, code);
  }

  @Patch('update-my-profile')
  updateMyProfile(@Req() req: any, @Body() dto: UpdatePatientDto) {
    return this.patientsService.updatePatientOwnProfile(req.user.id, dto);
  }

  // 1️⃣ Buscar cuidador por código (PÚBLICO o para pacientes logueados)
  @Get('caregiver-info/:code')
  getCaregiverInfo(@Param('code') code: string) {
    return this.patientsService.findCaregiverByCode(code);
  }

  // 2️⃣ Vincular a una ranura específica
  @Post('link-slot')
  linkSlot(@Req() req: any, @Body('patientId') patientId: number) {
    return this.patientsService.linkToPatient(req.user.id, patientId);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.patientsService.findAllForCaregiver(req.user.id); // ✅ CAMBIO: userId → id
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.patientsService.findOneForCaregiver(
      req.user.id, // ✅ CAMBIO: userId → id
      Number(id),
    );
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(
      req.user.id, // ✅ CAMBIO: userId → id
      Number(id),
      dto,
    );
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.patientsService.remove(req.user.id, Number(id)); // ✅ CAMBIO: userId → id
  }

  @Get(':id/history')
  getHistory(@Req() req: any, @Param('id') id: string, @Req() request: any) {
    const days = request.query?.days ? Number(request.query.days) : 7;
    return this.patientsService.getPatientHistory(req.user.id, Number(id), days);
  }

  @Get(':id/reminders')
  getReminders(@Req() req: any, @Param('id') id: string) {
    return this.patientsService.getPatientReminders(req.user.id, Number(id));
  }

  @Get(':id/daily-monitoring')
  getDailyMonitoring(@Req() req: any, @Param('id') id: string) {
    return this.patientsService.getDailyMonitoring(req.user.id, Number(id));
  }
}