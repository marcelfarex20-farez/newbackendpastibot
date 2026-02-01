
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function showStates() {
    const states = await (prisma as any).robotState.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 20
    });

    console.log("=== LATEST 20 ROBOT STATES ===");
    states.forEach((s: any) => {
        console.log(`[${s.updatedAt.toISOString()}] Serial: ${s.serialNumber}, Batt: ${s.batteryPct}%, WiFi: ${s.wifi}`);
    });
}

showStates().catch(console.error).finally(() => prisma.$disconnect());
