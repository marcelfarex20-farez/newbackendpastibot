
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findCaringUsers() {
    const users = await (prisma as any).user.findMany({
        where: { OR: [{ role: 'CUIDADOR' }, { role: 'PACIENTE' }] }
    });

    console.log("=== USERS AND THEIR PATIENTS ===");
    for (const u of users) {
        const patients = await (prisma as any).patient.findMany({
            where: { caregiverId: u.id }
        });
        if (patients.length > 0 || u.role === 'CUIDADOR') {
            console.log(`ID: ${u.id}, Name: "${u.name}", Email: ${u.email}, Role: ${u.role}`);
            console.log(`   Pacientes a su cargo (${patients.length}):`);
            patients.forEach((p: any) => {
                console.log(`   - [${p.id}] ${p.name}, Robot: "${p.robotSerialNumber}"`);
            });
            console.log("-------------------");
        }
    }
}

findCaringUsers().finally(() => prisma.$disconnect());
