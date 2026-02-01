import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetAndSimulate() {
    const serial = "esp32pastibot";

    // 1. Borrar TODO el historial de este robot para limpiar ruido
    await (prisma as any).robotState.deleteMany({
        where: { serialNumber: serial }
    });

    // 2. Crear un único reporte perfecto
    const state = await (prisma as any).robotState.create({
        data: {
            serialNumber: serial,
            status: "OK",
            wifi: true,
            batteryPct: 95,
            temperature: 32.5,
            uptime: "2h 15m",
            signalStrength: -55
        }
    });

    console.log("🚀 Base de datos reseteada. Único reporte activo:", state);
}

resetAndSimulate().catch(console.error).finally(() => prisma.$disconnect());
