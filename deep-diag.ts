import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNÓSTICO PROFUNDO ---');

    // 1. Ver qué ve el backend para el serial
    const targetSerial = 'esp32pastibot';
    const state = await (prisma as any).robotState.findFirst({
        where: { serialNumber: targetSerial },
        orderBy: { updatedAt: 'desc' },
    });

    // 2. Ver pacientes del cuidador (Anthony)
    const Anthony = await prisma.user.findFirst({
        where: { email: { contains: 'amsag' } }, // Anthony's email part
        include: { patients: true }
    });

    const report = {
        now: new Date().toISOString(),
        latest_heartbeat: state ? {
            id: state.id,
            at: state.updatedAt,
            diff_min: (new Date().getTime() - new Date(state.updatedAt).getTime()) / 60000
        } : 'NOT_FOUND',
        caregiver: Anthony ? {
            name: Anthony.name,
            patient_count: Anthony.patients.length,
            patients: Anthony.patients.map((p: any) => ({
                name: p.name,
                serial: p.robotSerialNumber
            }))
        } : 'NOT_FOUND'
    };

    process.stdout.write(JSON.stringify(report, null, 2));
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
