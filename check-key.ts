import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const key = process.env.FIREBASE_PRIVATE_KEY || '';
console.log('--- DIAGNÓSTICO DE CLAVE ---');
console.log('Longitud total raw:', key.length);
console.log('Primeros 50:', key.substring(0, 50));
console.log('Últimos 100:', key.substring(key.length - 100));

const body = key
    .replace(/-----BEGIN PRIVATE KEY-----/gi, '')
    .replace(/-----END PRIVATE KEY-----/gi, '')
    .replace(/\\n/g, '');

const pureBase64 = body.replace(/[^A-Za-z0-9+/=]/g, '');
console.log('Longitud Base64 Pura:', pureBase64.length);
console.log('Modulo 4:', pureBase64.length % 4);
console.log('Últimos 20 Base64:', pureBase64.substring(pureBase64.length - 20));
