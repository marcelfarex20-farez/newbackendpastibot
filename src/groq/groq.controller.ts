import { Controller, Post, Body, UseGuards, Logger, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

    @Post('transcribe')
    @UseInterceptors(FileInterceptor('audio'))
    async transcribe(@UploadedFile() file: Express.Multer.File) {
        try {
            this.logger.log(`🎙️ Solicitud de transcripción recibida`);

            if (!file) {
                return { success: false, error: 'No se recibió ningún archivo de audio' };
            }

            const text = await this.groqService.transcribe(file.path);

            return {
                success: true,
                text,
            };
        } catch (error) {
            this.logger.error('❌ Error en endpoint de transcripción:', error);
            return {
                success: false,
                error: 'No se pudo transcribir el audio. Por favor, intenta de nuevo.',
            };
        }
    }
}
