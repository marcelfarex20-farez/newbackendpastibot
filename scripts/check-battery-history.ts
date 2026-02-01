
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkBatteryHistory() {
    const states = await (prisma as any).robotState.findMany({
        where: {
            batteryPct: { gt: 0 }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
    });

    console.log(`=== FOUND ${states.length} RECORDS WITH BATTERY > 0% ===`);
    states.forEach((s: any) => {
        console.log(`[${s.updatedAt.toISOString()}] Serial: ${s.serialNumber}, Battery: ${s.batteryPct}%`);
    });
}

checkBatteryHistory().finally(() => prisma.$disconnect());
