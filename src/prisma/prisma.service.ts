import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const rawUrl = process.env.DATABASE_URL || '';
    const cleanUrl = rawUrl.trim().replace(/^"(.*)"$/, '$1'); // Quita espacios y comillas

    super({
      datasources: {
        db: {
          url: cleanUrl,
        },
      },
    });

    const host = cleanUrl.split('@')[1]?.split('/')[0] || 'DESCONOCIDO';
    console.log(`🔌 PRISMA INIT: Usando host -> ${host}`);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Conexión a DB establecida con éxito');
    } catch (e) {
      console.error('❌ Error fatal de conexión a DB:', e);
      // No lanzamos el error para que el servidor al menos levante y podamos ver el error en la API
    }
  }
}
