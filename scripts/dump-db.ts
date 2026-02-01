import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function checkDb() {
    const patients = await prisma.patient.findMany({
        include: { user: true }
    });

    const states = await prisma.robotState.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10
    });

    const output = {
        patients: patients.map(p => ({
            id: p.id,
            name: p.name,
            email: p.user?.email,
            robot: (p as any).robotSerialNumber,
            role: p.user?.role
        })),
        states: states.map(s => ({
            id: s.id,
            serial: (s as any).serialNumber,
            batt: s.batteryPct,
            temp: s.temperature,
            updated: s.updatedAt
        }))
    };

    fs.writeFileSync('db-dump.json', JSON.stringify(output, null, 2));
    console.log("✅ Dump guardado en db-dump.json");
}

checkDb().catch(console.error).finally(() => prisma.$disconnect());
