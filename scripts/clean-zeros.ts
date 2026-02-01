import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanZeros() {
    const result = await (prisma as any).robotState.deleteMany({
        where: {
            serialNumber: "esp32pastibot",
            batteryPct: 0
        }
    });
    console.log(`🗑️ Se eliminaron ${result.count} reportes con batería 0.`);
}

cleanZeros().catch(console.error).finally(() => prisma.$disconnect());
