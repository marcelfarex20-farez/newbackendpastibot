import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    const dbUrl = process.env.DATABASE_URL || '';
    const host = dbUrl.split('@')[1]?.split('/')[0] || 'DESCONOCIDO';
    console.log(`🔌 Intentando conectar a la base de datos en: ${host}`);
    try {
      await this.$connect();
      console.log('✅ Conexión a DB establecida');
    } catch (e) {
      console.error('❌ Error de conexión a DB:', e);
      throw e;
    }
  }
}
