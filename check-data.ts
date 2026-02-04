import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNÓSTICO DE DATOS ---');

    // 1. Verificar Pacientes y sus Seriales
    const patients = await prisma.patient.findMany();
    console.log(`\nPacientes encontrados: ${patients.length}`);
    patients.forEach(p => {
        console.log(`- [ID: ${p.id}] ${p.name} -> Serial: ${p.robotSerialNumber || 'NINGUNO'}`);
    });

    // 2. Verificar Medicinas sin Slot
    const medicines = await prisma.medicine.findMany({
        where: {
            OR: [
                { slot: null },
                { slot: undefined }
            ]
        }
    });
    console.log(`\nMedicinas sin Carril (Slot): ${medicines.length}`);
    medicines.forEach(m => {
        console.log(`- [ID: ${m.id}] ${m.name}`);
    });

    // 3. Verificar Robots Activos
    const states = await prisma.robotState.findMany({
        distinct: ['serialNumber'],
        orderBy: { updatedAt: 'desc' }
    });
    console.log(`\nRobots que han reportado estado: ${states.length}`);
    states.forEach(s => {
        console.log(`- Serial: ${s.serialNumber} (Último: ${s.updatedAt})`);
    });

    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
