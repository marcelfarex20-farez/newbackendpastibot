import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugAnthony() {
    const patient = await prisma.patient.findFirst({
        where: { name: { contains: "ANTHONY", mode: 'insensitive' } },
        include: { user: true }
    });

    if (patient) {
        console.log("🔍 DETALLES DE ANTHONY:");
        console.log(`- Patient ID: ${patient.id}`);
        console.log(`- Name: ${patient.name}`);
        console.log(`- User ID: ${patient.userId}`);
        console.log(`- User Email: ${patient.user?.email}`);
        console.log(`- Robot Serial: ${patient.robotSerialNumber}`);

        const states = await prisma.robotState.findMany({
            where: { serialNumber: "esp32pastibot" },
            orderBy: { updatedAt: 'desc' },
            take: 1
        });

        if (states.length > 0) {
            console.log("\n📡 ÚLTIMO ESTADO DEL ROBOT:");
            console.log(JSON.stringify(states[0], null, 2));
        } else {
            console.log("\n❌ No hay estados registrados para esp32pastibot.");
        }

    } else {
        console.log("❌ No se encontró el paciente Anthony.");
    }
}

debugAnthony().catch(console.error).finally(() => prisma.$disconnect());
