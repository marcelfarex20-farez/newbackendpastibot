import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findAnthony() {
    const patient = await prisma.patient.findFirst({
        where: {
            name: { contains: "ANTHONY", mode: 'insensitive' }
        }
    });

    if (patient) {
        console.log(`🎯 Encontrado: ${patient.name} (ID: ${patient.id})`);
        await prisma.patient.update({
            where: { id: patient.id },
            data: { robotSerialNumber: "esp32pastibot" }
        });
        console.log(`✅ Robot vinculado con éxito a ${patient.name}`);
    } else {
        console.log("❌ No se encontró ningún paciente con ese nombre.");
    }
}

findAnthony().catch(console.error).finally(() => prisma.$disconnect());
