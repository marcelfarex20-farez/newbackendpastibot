
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnose() {
    console.log("=== DIAGNÓSTICO DE RELACIONES ===");

    // 1. Ver todos los cuidadores
    const caregivers = await (prisma as any).user.findMany({ where: { role: 'CUIDADOR' } });
    for (const c of caregivers) {
        const patients = await (prisma as any).patient.findMany({ where: { caregiverId: c.id } });
        console.log(`CUIDADOR: [ID: ${c.id}] ${c.email} (${c.name})`);
        if (patients.length === 0) {
            console.log("   ⚠️ No tiene pacientes asignados.");
        } else {
            patients.forEach((p: any) => {
                console.log(`   - PACIENTE: [ID: ${p.id}] ${p.name} -> Robot: "${p.robotSerialNumber}"`);
            });
        }
    }

    // 2. Ver si el robot tiene estados reportados
    const states = await (prisma as any).robotState.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5
    });
    console.log("\n=== ÚLTIMOS ESTADOS DEL ROBOT ===");
    states.forEach((s: any) => {
        console.log(`[${s.updatedAt.toISOString()}] Serial: "${s.serialNumber}" | Batt: ${s.batteryPct}%`);
    });

    // 3. Ver si hay pacientes sin cuidador con ese serial
    const orphanPatients = await (prisma as any).patient.findMany({
        where: { robotSerialNumber: 'esp32pastibot', caregiverId: null }
    });
    if (orphanPatients.length > 0) {
        console.log(`\n⚠️ ENCONTRADOS ${orphanPatients.length} PACIENTES CON EL ROBOT PERO SIN CUIDADOR:`);
        orphanPatients.forEach((p: any) => console.log(`   - [ID: ${p.id}] ${p.name}`));
    }
}

diagnose().finally(() => prisma.$disconnect());
