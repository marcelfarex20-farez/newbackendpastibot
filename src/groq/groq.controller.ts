import { Controller, Post, Body, UseGuards, Logger, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
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
    @UseInterceptors(FileInterceptor('audio', {
        storage: diskStorage({
            destination: join(process.cwd(), 'uploads'),
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
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
        } catch (error: any) {
            this.logger.error('❌ Error en endpoint de transcripción:', error.message || error);
            return {
                success: false,
                error: `No se pudo transcribir el audio: ${error.message || 'Error del servidor'}`,
            };
        }
    }
}
