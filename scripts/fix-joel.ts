
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixJoel() {
    const serial = 'esp32pastibot';

    // 1. Buscamos a Joel
    const targetPatient = await (prisma as any).patient.findFirst({
        where: { name: { contains: 'Joel' } }
    });

    if (!targetPatient) {
        console.log("No se encontró al paciente 'Joel'.");
        return;
    }

    // 2. Buscamos al cuidador amsagbay@sudamericano.edu.ec (ID 60) 
    // O el cuidador que deba tener a Joel. 
    // Joel actualmente tiene caregiverId: 1 segun el script anterior? 
    // No, el script de arriba falló mostrando fragmentos.

    const joelCaregiverId = targetPatient.caregiverId;

    console.log(`Vinculando robot ${serial} a ${targetPatient.name} (ID: ${targetPatient.id})`);

    await (prisma as any).patient.update({
        where: { id: targetPatient.id },
        data: { robotSerialNumber: serial }
    });

    console.log("✅ VINCULACIÓN EXITOSA PARA JOEL.");
}

fixJoel().finally(() => prisma.$disconnect());
