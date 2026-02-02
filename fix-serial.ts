import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- ACTUALIZACIÓN DE SERIALES ---');

    // Actualizar todos los pacientes para que tengan el serial correcto
    const result = await (prisma as any).patient.updateMany({
        data: {
            robotSerialNumber: 'esp32pastibot'
        }
    });

    console.log(`✅ Se actualizaron ${result.count} registros de pacientes.`);

    // También asegurar que el inventario por defecto existe
    for (let slot = 1; slot <= 4; slot++) {
        await (prisma as any).robotInventory.upsert({
            where: {
                serialNumber_slot: {
                    serialNumber: 'esp32pastibot',
                    slot: slot
                }
            },
            update: {},
            create: {
                serialNumber: 'esp32pastibot',
                slot: slot,
                medicineName: `Medicina carril ${slot}`
            }
        });
    }

    console.log('✅ Inventario base asegurado para "esp32pastibot".');
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
