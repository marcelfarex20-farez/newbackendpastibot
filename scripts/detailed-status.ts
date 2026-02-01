
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function showDetailedStatus() {
    const states = await (prisma as any).robotState.findMany({
        where: { serialNumber: 'esp32pastibot' },
        orderBy: { updatedAt: 'desc' },
        take: 5
    });

    console.log("=== LATEST 5 ROBOT STATES ===");
    console.log(JSON.stringify(states, null, 2));
}

showDetailedStatus().finally(() => prisma.$disconnect());
