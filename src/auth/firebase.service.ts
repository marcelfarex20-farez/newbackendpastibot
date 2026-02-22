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
                // 1. Quitar todos los caracteres no base64 para detectar solo la "carne" de la clave
                let body = privateKey
                    .replace(/-----BEGIN PRIVATE KEY-----/gi, '')
                    .replace(/-----END PRIVATE KEY-----/gi, '')
                    .replace(/[^A-Za-z0-9+/=]/g, '');

                // 2. AUTO-REPARAR PADDING (Si falta un '=')
                // A veces Railway corta el último '=' al final de la variable.
                while (body.length % 4 !== 0) {
                    body += '=';
                }

                // 3. Re-formatear con headers para Nest/Firebase
                const cleanedKey = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----\n`;

                console.log('🔍 Auditoría de Clave Firebase (V4 - AutoRepair):');
                console.log(`- Longitud Base64: ${body.length} caracteres`);
                console.log(`- Formato PEM generado correctamente`);

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
