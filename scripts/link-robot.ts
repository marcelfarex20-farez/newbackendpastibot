import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const serial = "esp32pastibot";

    // Buscamos el primer paciente para vincularlo (generalmente el de prueba)
    const patient = await prisma.patient.findFirst();

    if (patient) {
        await prisma.patient.update({
            where: { id: patient.id },
            data: { robotSerialNumber: serial }
        });
        console.log(`✅ Paciente "${patient.name}" vinculado al robot: ${serial}`);
    } else {
        console.log("❌ No se encontró ningún paciente en la base de datos.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
