import { IsInt, Min, Max } from 'class-validator';

export class DispenseSlotDto {
    @IsInt()
    @Min(1)
    @Max(4)
    slot: number; // Carril directo (1-4)

    @IsInt()
    @Min(1)
    amount: number; // cantidad de pastillas a dispensar
}
