
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkHeartbeat() {
    const latestState = await (prisma as any).robotState.findFirst({
        orderBy: { updatedAt: 'desc' }
    });

    const latestLogs = await (prisma as any).robotLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log("=== LATEST ROBOT HEARTBEAT ===");
    if (latestState) {
        console.log(`Serial: ${latestState.serialNumber}`);
        console.log(`Battery: ${latestState.batteryPct}%`);
        console.log(`Last Update: ${latestState.updatedAt.toLocaleString()}`);

        const now = new Date();
        const diff = (now.getTime() - latestState.updatedAt.getTime()) / 1000;
        console.log(`Updated ${diff.toFixed(1)} seconds ago`);
    } else {
        console.log("No robot states found in DB.");
    }

    console.log("\n=== LATEST ROBOT LOGS ===");
    latestLogs.forEach((l: any, i: number) => {
        console.log(`${i + 1}. [${l.createdAt.toLocaleTimeString()}] ${l.message}`);
    });
}

checkHeartbeat();
