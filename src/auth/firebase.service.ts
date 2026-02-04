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

                // ☢️ LIMPIEZA NUCLEAR (Indestructible)
                // 1. Quitar las cabeceras/pies si existen para que no se mezclen con el base64
                let body = privateKey
                    .replace(/-----BEGIN PRIVATE KEY-----/gi, '')
                    .replace(/-----END PRIVATE KEY-----/gi, '')
                    .replace(/\\n/g, ''); // Quitar literal \n por si acaso

                // 2. Extraer ÚNICAMENTE caracteres válidos de Base64 (A-Z, a-z, 0-9, +, /, =)
                // Esto borra comillas, espacios, guiones de cabecera que hayan quedado, etc.
                const pureBase64 = body.replace(/[^A-Za-z0-9+/=]/g, '');

                // 3. Formatear en bloques de 64 caracteres (estándar PEM estricto)
                const chunks = pureBase64.match(/.{1,64}/g);
                const cleanedKey = chunks
                    ? `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`
                    : '';

                console.log('🔍 Auditoría de Clave Firebase:');
                console.log(`- Base64 detectado: ${pureBase64.substring(0, 20)}...[${pureBase64.length} chars]...${pureBase64.substring(pureBase64.length - 10)}`);
                console.log(`- Longitud final PEM: ${cleanedKey.length}`);

                if (pureBase64.length < 1500) {
                    console.error('❌ ERROR: La clave parece demasiado corta o corrupta. Revisa Railway.');
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
