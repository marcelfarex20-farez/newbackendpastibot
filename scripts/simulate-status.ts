import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function simulateRobotStatus() {
    const serial = "esp32pastibot";

    console.log(`🤖 Simulando reporte de estado para el robot: ${serial}...`);

    const state = await prisma.robotState.create({
        data: {
            serialNumber: serial,
            status: 'OK',
            wifi: true,
            batteryPct: 88,
            temperature: 31.5,
            uptime: "12m 45s",
            signalStrength: -55,
        },
    });

    console.log("✅ Reporte guardado con éxito.");
    console.log(state);
}

simulateRobotStatus()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
