
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function showLogs() {
    const logs = await (prisma as any).robotLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    console.log("=== LATEST 20 ROBOT LOGS ===");
    logs.forEach((l: any) => {
        console.log(`[${l.createdAt.toISOString()}] ${l.message}`);
    });
}

showLogs().catch(console.error).finally(() => prisma.$disconnect());
