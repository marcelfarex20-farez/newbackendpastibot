
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDebugLogs() {
    const logs = await (prisma as any).robotLog.findMany({
        where: {
            message: { contains: '[DEBUG]' }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`=== FOUND ${logs.length} DEBUG LOGS ===`);
    logs.forEach((l: any) => {
        console.log(`[${l.createdAt.toISOString()}] ${l.message}`);
    });
}

checkDebugLogs().finally(() => prisma.$disconnect());
