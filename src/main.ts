import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 Pastibot Backend iniciando bootstrap...');

  // 📂 DIAGNÓSTICO DE VARIABLES (Solo nombres, no valores por seguridad)
  const envKeys = Object.keys(process.env);
  console.log(`🔍 Variables detectadas (${envKeys.length}): ${envKeys.sort().join(', ')}`);

  const app = await NestFactory.create(AppModule);

  // 1. CORS primero!!!
  app.enableCors({
    origin: true, // Permitir cualquier origen que venga en la cabecera (dinámico)
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 2. Límites de carga
  const express = require('express');
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));


  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Backend de Pastibot corriendo en el puerto http://localhost:${port} Perrito =)`);
}
bootstrap();
