import { Module } from '@nestjs/common';
import { RobotService } from './robot.service';
import { RobotController } from './robot.controller';
import { RobotGateway } from './robot.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    PrismaModule,
    HttpModule, // Para hacer requests HTTP al ESP32
  ],
  controllers: [RobotController],
  providers: [RobotService, RobotGateway],
  exports: [RobotService, RobotGateway],
})
export class RobotModule { }
