import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { GroqService } from './groq.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('groq')
@UseGuards(JwtAuthGuard) // Requiere autenticación JWT
export class GroqController {
    private readonly logger = new Logger(GroqController.name);

    constructor(private readonly groqService: GroqService) { }

    @Post('chat')
    async chat(@Body() chatDto: ChatDto) {
        try {
            this.logger.log(`💬 Nueva solicitud de chat recibida`);

            const response = await this.groqService.chat(
                chatDto.message,
                chatDto.conversationHistory || [],
            );

            return {
                success: true,
                response,
            };
        } catch (error) {
            this.logger.error('❌ Error en endpoint de chat:', error);
            return {
                success: false,
                error: 'No se pudo procesar tu mensaje. Por favor, intenta de nuevo.',
            };
        }
    }
}
