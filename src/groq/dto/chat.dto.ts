import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
    @IsString()
    @IsNotEmpty()
    role: string;

    @IsString()
    @IsNotEmpty()
    content: string;
}

export class ChatDto {
    @IsString()
    @IsNotEmpty()
    message: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => MessageDto)
    conversationHistory?: MessageDto[];
}
