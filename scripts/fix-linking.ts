import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixLinking() {
    const serial = "esp32pastibot";

    // 1. Quitar el serial de cualquier otro paciente que lo tenga
    await prisma.patient.updateMany({
        where: { robotSerialNumber: serial },
        data: { robotSerialNumber: null }
    });

    // 2. Buscar a Anthony
    const anthony = await prisma.patient.findFirst({
        where: { name: { contains: "ANTHONY", mode: 'insensitive' } }
    });

    if (anthony) {
        await prisma.patient.update({
            where: { id: anthony.id },
            data: { robotSerialNumber: serial }
        });
        console.log(`✅ Robot vinculado correctamente a ${anthony.name}`);
    } else {
        console.log("❌ No se encontró a Anthony.");
    }
}

fixLinking().catch(console.error).finally(() => prisma.$disconnect());
