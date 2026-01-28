import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    onModuleInit() {
        try {
            if (admin.apps.length === 0) {
                const privateKey = process.env.FIREBASE_PRIVATE_KEY;
                if (!privateKey) {
                    console.warn('⚠️ FIREBASE_PRIVATE_KEY no está definida. El login nativo no funcionará.');
                    return;
                }

                const serviceAccount = {
                    type: "service_account",
                    project_id: process.env.FIREBASE_PROJECT_ID,
                    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                    private_key: privateKey.replace(/\\n/g, '\n'),
                    client_email: process.env.FIREBASE_CLIENT_EMAIL,
                    client_id: process.env.FIREBASE_CLIENT_ID,
                    auth_uri: "https://accounts.google.com/o/oauth2/auth",
                    token_uri: "https://oauth2.googleapis.com/token",
                    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
                    universe_domain: "googleapis.com"
                } as admin.ServiceAccount;

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log('🔥 Firebase Admin inicializado correctamente');
            }
        } catch (error) {
            console.error('❌ Error crítico inicializando Firebase Admin:', error);
            // No lanzamos el error para que el servidor no se caiga
        }
    }

    async createCustomToken(uid: string, additionalClaims?: any): Promise<string> {
        try {
            // UID debe ser un string único. Usamos el ID de nuestra DB precedido de 'pb_'
            // o el email si es login social.
            const token = await admin.auth().createCustomToken(uid, additionalClaims);
            return token;
        } catch (error) {
            console.error('❌ Error creando Custom Token:', error);
            throw error;
        }
    }
}
