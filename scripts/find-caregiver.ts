
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findAnthonyCaregiver() {
    const caregivers = await (prisma as any).user.findMany({
        where: { role: 'CUIDADOR' }
    });

    console.log("=== CUIDADORES DISPONIBLES ===");
    for (const c of caregivers) {
        const patients = await (prisma as any).patient.findMany({
            where: { caregiverId: c.id }
        });
        console.log(`ID: ${c.id}, Name: "${c.name}", Email: ${c.email}`);
        console.log(`   Pacientes (${patients.length}):`);
        patients.forEach((p: any) => {
            console.log(`   - [${p.id}] ${p.name}, Robot: "${p.robotSerialNumber}"`);
        });
    }
}

findAnthonyCaregiver();
