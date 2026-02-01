
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixAssociation() {
    const serial = 'esp32pastibot';
    const caregiverEmail = 'amsagbay@sudamericano.edu.ec'; // El que tiene ID 60

    const caregiver = await (prisma as any).user.findUnique({ where: { email: caregiverEmail } });
    if (!caregiver) {
        console.log("No se encontró el cuidador.");
        return;
    }

    // 1. Buscamos el paciente que tiene el serial
    const patient = await (prisma as any).patient.findFirst({
        where: { robotSerialNumber: serial }
    });

    if (patient) {
        console.log(`Vinculando paciente [ID: ${patient.id}] ${patient.name} al cuidador [ID: ${caregiver.id}]`);
        await (prisma as any).patient.update({
            where: { id: patient.id },
            data: { caregiverId: caregiver.id }
        });
        console.log("✅ VINCULACIÓN EXITOSA.");
    } else {
        console.log("No se encontró ningún paciente con ese serial de robot para vincular.");
    }
}

fixAssociation().finally(() => prisma.$disconnect());
