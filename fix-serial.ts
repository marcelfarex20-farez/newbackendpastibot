import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- ACTUALIZACIÓN DE DATOS PASTIBOT ---');

    // 1. Asegurar Serial en todos los pacientes
    const patientResult = await (prisma as any).patient.updateMany({
        data: {
            robotSerialNumber: 'esp32pastibot'
        }
    });
    console.log(`✅ ${patientResult.count} pacientes vinculados a "esp32pastibot".`);

    // 2. Reparar medicinas sin Slot (Carril)
    // Buscamos medicinas que tengan slot null o 0
    const medsToFix = await (prisma as any).medicine.findMany({
        where: {
            OR: [
                { slot: null },
                { slot: 0 }
            ]
        }
    });

    console.log(`🔍 Encontradas ${medsToFix.length} medicinas sin carril.`);

    for (const med of medsToFix) {
        // Asignamos un carril por defecto (ej. el 1) si no tiene
        await (prisma as any).medicine.update({
            where: { id: med.id },
            data: { slot: 1 }
        });
        console.log(`   🔸 Medicina '${med.name}' (ID ${med.id}) asignada al Carril 1`);
    }

    // 3. Asegurar inventario base
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
                medicineName: `Medicina Carril ${slot}`
            }
        });
    }

    console.log('✅ Inventario base sincronizado.');
    console.log('\n--- PROCESO COMPLETADO ---');
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
