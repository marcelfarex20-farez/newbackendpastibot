import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNÓSTICO DE ENTORNO ---');
    console.log(`DATABASE_URL (process.env): ${process.env.DATABASE_URL?.substring(0, 50)}...`);

    try {
        const result = await prisma.$queryRaw`SELECT current_database(), current_schema();`;
        console.log('✅ Conexión Prisma Exitosa:');
        console.log(JSON.stringify(result, null, 2));

        const userCount = await prisma.user.count();
        console.log(`Total usuarios en esta base de datos: ${userCount}`);
    } catch (e) {
        console.error('❌ Error consultando DB:', e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
