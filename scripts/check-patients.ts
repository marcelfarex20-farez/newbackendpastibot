import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findCorrectPatient() {
    const patients = await prisma.patient.findMany({
        include: { user: true }
    });

    console.log("📋 Lista de Pacientes:");
    patients.forEach(p => {
        console.log(`- ID: ${p.id} | Nombre: ${p.name} | User: ${p.user?.email} | Robot: ${(p as any).robotSerialNumber}`);
    });
}

findCorrectPatient().catch(console.error).finally(() => prisma.$disconnect());
