import { IsBoolean, IsInt, IsIn, Max, Min } from 'class-validator';

export class CreateStatusDto {
  @IsIn(['OK', 'DISPENSANDO', 'ERROR'])
  status: 'OK' | 'DISPENSANDO' | 'ERROR';

  serialNumber: string; // 👈 Agregado para identificar el robot

  @IsBoolean()
  wifi: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  batteryPct: number;

  temperature?: number;
  uptime?: string;
  signalStrength?: number;
}
