
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function simulateCaregiverRequest() {
    // 1. Encontrar al cuidador que estamos usando (probablemente el único con PACIENTES vinculados)
    const caregiver = await (prisma as any).user.findFirst({
        where: { role: 'CUIDADOR' }
    });

    if (!caregiver) {
        console.log("No caregiver found.");
        return;
    }

    console.log(`Simulando para cuidador: ${caregiver.name} (ID: ${caregiver.id})`);

    // Lógica que puse en el RobotService
    const patientWithRobot = await (prisma as any).patient.findFirst({
        where: {
            caregiverId: caregiver.id,
            robotSerialNumber: { not: null }
        },
        select: { robotSerialNumber: true, name: true }
    });

    if (patientWithRobot) {
        console.log(`✅ Paciente vinculado encontrado: ${patientWithRobot.name}`);
        console.log(`🤖 Serial vinculado: "${patientWithRobot.robotSerialNumber}"`);

        const state = await (prisma as any).robotState.findFirst({
            where: { serialNumber: patientWithRobot.robotSerialNumber },
            orderBy: { updatedAt: 'desc' }
        });

        if (state) {
            console.log("🟢 ESTADO ENCONTRADO:");
            console.log(`- Batería: ${state.batteryPct}%`);
            console.log(`- Temp: ${state.temperature}°C`);
            console.log(`- Actualizado: ${state.updatedAt.toISOString()}`);
        } else {
            console.log("🔴 NO SE ENCONTRÓ ESTADO en RobotState para ese serial.");
        }
    } else {
        console.log("❌ No se encontró ningún paciente con robot vinculado para este cuidador.");
    }
}

simulateCaregiverRequest().catch(console.error).finally(() => prisma.$disconnect());
