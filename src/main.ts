import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 Pastibot Backend iniciando bootstrap...');
  const app = await NestFactory.create(AppModule);

  // 📸 Aumentar límite de carga para fotos de medicina (Base64)
  const express = require('express');
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir: localhost (dev), Railway (prod), y Capacitor (mobile)
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://pastibot-fronted.vercel.app', // Ejemplo si usas vercel
        /^capacitor:\/\/localhost$/,
        /^http:\/\/localhost$/,
        'https://pastibotbackend-production.up.railway.app'
      ];

      if (!origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });


  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Backend de Pastibot corriendo en el puerto http://localhost:${port} Perrito =)`);
}
bootstrap();
