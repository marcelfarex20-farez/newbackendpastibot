
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkJoel() {
    const joel = await (prisma as any).patient.findFirst({
        where: { name: { contains: 'Joel' } }
    });

    if (joel) {
        console.log(`PATIENTE: ${joel.name} (ID: ${joel.id})`);
        console.log(`SERIAL VINCULADO: "${joel.robotSerialNumber}"`);
        console.log(`CUIDADOR ID: ${joel.caregiverId}`);

        // Check robot stats specifically for this serial
        const stats = await (prisma as any).robotState.findFirst({
            where: { serialNumber: joel.robotSerialNumber },
            orderBy: { updatedAt: 'desc' }
        });

        if (stats) {
            console.log(`ESTADO ROBOT: OK`);
            console.log(`Última actualización: ${stats.updatedAt.toISOString()}`);
        } else {
            console.log(`ESTADO ROBOT: NO ENCONTRADO EN DB`);
        }
    } else {
        console.log("No se encontró a ningún paciente con el nombre 'Joel'.");
    }
}

checkJoel().finally(() => prisma.$disconnect());
