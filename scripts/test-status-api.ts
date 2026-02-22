
import axios from 'axios';

async function testStatusAPI() {
    const API_URL = 'https://newbackendpastibot-production.up.railway.app';
    // Necesitamos un token válido. Como no lo tengo, voy a intentar ver si el endpoint es público o si falla con 401.
    // Pero mejor, voy a crear un script que use Prisma directamente para simular el servicio.
    console.log("Testing API endpoint locally via direct service call simulation...");
}

// Re-usando la lógica del servicio para ver qué devolvería el controlador
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function simulateController() {
    const userId = 1; // El ID del cuidador amsagbay@sudamericano.edu.ec

    console.log(`--- Simulando RobotController.getLatestStatus para User ID ${userId} ---`);

    const patientWithRobot = await (prisma as any).patient.findFirst({
        where: {
            caregiverId: userId,
            NOT: { robotSerialNumber: null }
        }
    });

    if (!patientWithRobot) {
        console.log("Resultado: NULL (No se encontró paciente con robot para este ID)");
        return;
    }

    console.log(`Paciente encontrado: ${patientWithRobot.name}, Serial: ${patientWithRobot.robotSerialNumber}`);

    const state = await (prisma as any).robotState.findFirst({
        where: { serialNumber: patientWithRobot.robotSerialNumber },
        orderBy: { updatedAt: 'desc' }
    });

    console.log("Resultado final que iría al Frontend:");
    console.log(JSON.stringify(state, null, 2));
}

simulateController().finally(() => prisma.$disconnect());
