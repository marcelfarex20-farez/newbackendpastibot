import { IsInt, Min, Max, IsString, MinLength } from 'class-validator';

export class UpdateInventoryDto {
    @IsInt()
    @Min(1)
    @Max(4)
    slot: number;

    @IsString()
    @MinLength(1)
    medicineName: string;
}
