import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    onModuleInit() {
        console.log('📦 FirebaseService cargado (Estará listo cuando se use)');
    }

    private ensureInitialized() {
        try {
            if (admin.apps.length === 0) {
                console.log('🏗️ Iniciando carga de credenciales de Firebase...');

                let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
                const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
                const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();

                if (!privateKey || !projectId || !clientEmail) {
                    console.error('❌ ERROR: Faltan variables de entorno críticas de Firebase en Railway.');
                    return false;
                }

                // 🛡️ REGLA DE ORO PARA RAILWAY/NODE:
                // Las claves privadas suelen venir con literal \n o con comillas accidentales.
                let cleanedKey = privateKey
                    .replace(/\\n/g, '\n') // Convertir literal \n en saltos de línea reales
                    .replace(/^"/, '')      // Quitar comilla inicial
                    .replace(/"$/, '');     // Quitar comilla final

                // Si por alguna razón la clave no tiene los headers, los ponemos
                if (!cleanedKey.includes('-----BEGIN PRIVATE KEY-----')) {
                    cleanedKey = `-----BEGIN PRIVATE KEY-----\n${cleanedKey}\n-----END PRIVATE KEY-----\n`;
                }

                console.log('🔍 Auditoría de Clave Firebase (V3):');
                console.log(`- Longitud detectada: ${cleanedKey.length} caracteres`);
                console.log(`- Inicio: ${cleanedKey.substring(0, 30)}...`);
                console.log(`- Fin: ...${cleanedKey.substring(cleanedKey.length - 30)}`);

                if (cleanedKey.length < 1000) {
                    console.error('❌ ERROR: La clave parece demasiado corta. Revisa Railway.');
                    return false;
                }

                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: projectId,
                        privateKey: cleanedKey,
                        clientEmail: clientEmail,
                    }),
                });
                console.log('🔥 Firebase Admin inicializado correctamente');
            }
            return true;
        } catch (error) {
            console.error('❌ Error crítico inicializando Firebase Admin:', error);
            return false;
        }
    }

    async createCustomToken(uid: string, additionalClaims?: any): Promise<string> {
        if (!this.ensureInitialized()) {
            throw new Error('Firebase Admin no pudo ser inicializado. Revisa las variables de entorno en Railway.');
        }

        console.log('🔑 Creando Token para:', uid);
        try {
            const token = await admin.auth().createCustomToken(uid, additionalClaims);
            console.log('✅ Token creado');
            return token;
        } catch (error) {
            console.error('❌ Error en createCustomToken:', error);
            throw error;
        }
    }

    async verifyIdToken(idToken: string) {
        if (!this.ensureInitialized()) {
            throw new Error('Firebase Admin no pudo ser inicializado. Revisa las variables de entorno en Railway.');
        }

        try {
            return await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            console.error('❌ Error verificando ID Token de Firebase:', error);
            throw error;
        }
    }

    // 🚀 NUEVO: Enviar Notificación Push
    async sendPushNotification(token: string, title: string, body: string, data?: any) {
        if (!this.ensureInitialized()) return;

        try {
            const message = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                token: token,
                android: {
                    notification: {
                        sound: 'default'
                    }
                }
            };

            const response = await admin.messaging().send(message);
            console.log('🔔 Notificación enviada con éxito:', response);
            return response;
        } catch (error) {
            console.error('❌ Error enviando notificación:', error);
            // No lanzamos error para no interrumpir el flujo principal
        }
    }
}
