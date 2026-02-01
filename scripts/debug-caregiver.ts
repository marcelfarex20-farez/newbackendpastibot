
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCaregiver() {
    // Buscar cuidadores
    const caregivers = await (prisma as any).user.findMany({
        where: { role: 'CUIDADOR' },
        include: {
            patients: true
        }
    });

    console.log("CUIDADORES EN DATABASE:");
    for (const c of caregivers) {
        console.log(`- ${c.name} (${c.email})`);
        console.log(`  Pacientes: ${c.patients.length}`);
        for (const p of c.patients) {
            console.log(`    * ${p.name} -> Robot: ${p.robotSerialNumber}`);
        }
    }
}

checkCaregiver();
