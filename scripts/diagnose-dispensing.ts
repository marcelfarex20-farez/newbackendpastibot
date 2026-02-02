
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE DISPENSACIÓN...');

    // 1. Verificación de Medicinas y Recordatorios
    const medicines = await prisma.medicine.findMany({
        where: { slot: { not: null } },
        include: { reminders: true, patient: true },
    });

    console.log(`\n💊 Medicinas con slot configurado (${medicines.length}):`);
    medicines.forEach(m => {
        console.log(`- ${m.name} (ID: ${m.id}) en Slot: ${m.slot}`);
        console.log(`  Paciente: ${m.patient?.name || 'SIN PACIENTE'} (Serial: ${m.patient?.robotSerialNumber || 'SIN SERIAL'})`);
        console.log(`  Recordatorios:`, m.reminders.map(r => `${r.time} [${r.days}] (Activo: ${r.active})`));
    });

    // 2. Verificación de Tareas de Dispensación
    const tasks = await (prisma as any).dispensationTask.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    console.log(`\n📋 Últimas 10 Tareas de Dispensación:`);
    tasks.forEach(t => {
        console.log(`- [${t.createdAt.toISOString()}] Serial: ${t.serialNumber}, Slot: ${t.slot}, Status: ${t.status}`);
    });

    // 3. Verificación de Logs del Robot
    const logs = await (prisma as any).robotLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    console.log(`\n📡 Últimos 10 Logs del Robot:`);
    logs.forEach(l => {
        console.log(`- [${l.createdAt.toISOString()}] ${l.message}`);
    });

    // 4. Verificación de Hora del Servidor
    const now = new Date();
    const local = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    console.log(`\n⏰ Hora Local Calculada (UTC-5): ${local.getUTCHours()}:${local.getUTCMinutes()}`);
    console.log(`📅 Día Local: ${['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'][local.getUTCDay()]}`);
}

diagnose()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
