import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import * as fs from 'fs';

@Injectable()
export class GroqService {
    private readonly logger = new Logger(GroqService.name);
    private groq: Groq;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GROQ_API_KEY');

        if (!apiKey) {
            this.logger.warn('⚠️ GROQ_API_KEY no está configurada en el archivo .env');
        }

        this.groq = new Groq({
            apiKey: apiKey,
        });
    }

    /**
     * Envía un mensaje al modelo de IA de GROQ y obtiene una respuesta
     * @param message - Mensaje del usuario
     * @param conversationHistory - Historial de conversación opcional
     * @returns Respuesta del asistente de IA
     */
    async chat(
        message: string,
        conversationHistory: Array<{ role: string; content: string }> = [],
    ): Promise<string> {
        try {
            this.logger.log(`📨 Enviando mensaje a GROQ: ${message.substring(0, 50)}...`);

            // Construir el array de mensajes con el historial + nuevo mensaje
            const messages = [
                {
                    role: 'system',
                    content:
                        'Eres un asistente médico virtual amigable y profesional para la aplicación Pastibot. ' +
                        'Tu objetivo es ayudar a pacientes y cuidadores con información sobre salud, medicamentos, ' +
                        'cuidados médicos y bienestar general. Siempre proporciona respuestas claras, empáticas y ' +
                        'basadas en información médica confiable. Si no estás seguro de algo, recomienda consultar ' +
                        'con un profesional de la salud. Responde en español de manera concisa y útil.',
                },
                ...conversationHistory,
                {
                    role: 'user',
                    content: message,
                },
            ];

            // Llamar a la API de GROQ
            const chatCompletion = await this.groq.chat.completions.create({
                messages: messages as any,
                model: 'llama-3.3-70b-versatile', // Modelo rápido y potente de GROQ
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1,
                stream: false,
            });

            const response = chatCompletion.choices[0]?.message?.content ||
                'Lo siento, no pude generar una respuesta en este momento.';

            this.logger.log(`✅ Respuesta recibida de GROQ: ${response.substring(0, 50)}...`);

            return response;
        } catch (error) {
            this.logger.error('❌ Error al comunicarse con GROQ:', error);
            throw new Error('No se pudo obtener respuesta del asistente de IA');
        }
    }

    /**
     * Transcribe un archivo de audio usando GROQ Whisper
     * @param filePath - Ruta al archivo de audio temporal
     * @returns Texto transcrito
     */
    async transcribe(filePath: string): Promise<string> {
        try {
            this.logger.log(`🎙️ Transcribiendo audio: ${filePath}`);

            const transcription = await this.groq.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: 'whisper-large-v3',
                prompt: 'El audio es sobre salud, medicina o uso de la aplicación Pastibot.',
                response_format: 'text',
                language: 'es',
                temperature: 0.0,
            });

            this.logger.log(`✅ Transcripción completada: ${transcription}`);
            return transcription as unknown as string;
        } catch (error: any) {
            this.logger.error('❌ Error al transcribir audio con GROQ:', error.message || error);
            if (error.response) {
                this.logger.error('Data error GROQ:', error.response.data);
            }
            throw new Error(`Error en Whisper: ${error.message || 'Desconocido'}`);
        } finally {
            // Eliminar el archivo temporal después de procesarlo
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    this.logger.log(`🗑️ Archivo temporal eliminado: ${filePath}`);
                } else {
                    this.logger.warn(`⚠️ El archivo no existe para ser eliminado: ${filePath}`);
                }
            } catch (e) {
                this.logger.warn('⚠️ No se pudo eliminar el archivo temporal:', e);
            }
        }
    }
}
