import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import * as fs from 'fs';

@Injectable()
export class GroqService {
    private readonly logger = new Logger(GroqService.name);
    private groq: Groq | null;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GROQ_API_KEY');

        if (!apiKey) {
            this.logger.warn('⚠️ [GROQ_SERVICE] Alerta: GROQ_API_KEY no detectada. El chat de IA fallará.');
        }

        // 🛡️ Prevenir crash si la clave es nula o vacía
        if (apiKey && apiKey.trim() !== '') {
            this.groq = new Groq({
                apiKey: apiKey,
            });
        } else {
            this.groq = null;
        }
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
        if (!this.groq) {
            this.logger.error('❌ Chat intentado sin GROQ_API_KEY configurada.');
            return 'Servicio de IA no disponible (Falta configuración).';
        }

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
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || error.message || 'Error desconocido';
            const statusCode = error.status || error.response?.status;

            this.logger.error(`❌ Error al comunicarse con GROQ (Status ${statusCode}): ${errorMessage}`);

            if (statusCode === 401) {
                return 'Error de autenticación: La clave GROQ_API_KEY parece ser inválida.';
            }

            throw new Error(`No se pudo obtener respuesta del asistente de IA: ${errorMessage}`);
        }
    }

}
