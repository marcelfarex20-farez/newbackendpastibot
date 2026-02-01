import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDb() {
    const patients = await prisma.patient.findMany({
        include: { user: true }
    });

    console.log("=== PACIENTES ===");
    console.table(patients.map(p => ({
        id: p.id,
        name: p.name,
        email: p.user?.email,
        robot: p.robotSerialNumber,
        caregiverId: p.caregiverId
    })));

    const states = await prisma.robotState.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5
    });

    console.log("\n=== ESTADOS DE ROBOT ===");
    console.table(states.map(s => ({
        id: s.id,
        serial: s.serialNumber,
        batt: s.batteryPct,
        temp: s.temperature,
        updated: s.updatedAt
    })));
}

checkDb().catch(console.error).finally(() => prisma.$disconnect());
