
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findAnyRobot() {
    const patients = await (prisma as any).patient.findMany({
        where: {
            NOT: { robotSerialNumber: null }
        },
        include: { caregiver: true }
    });

    console.log(`=== FOUND ${patients.length} PATIENTS WITH ROBOTS ===`);
    patients.forEach((p: any) => {
        console.log(`- [ID: ${p.id}] ${p.name} -> Serial: "${p.robotSerialNumber}"`);
        console.log(`  CAREGIVER: [ID: ${p.caregiverId}] ${p.caregiver?.email}`);
    });
}

findAnyRobot().finally(() => prisma.$disconnect());
