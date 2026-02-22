import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Iniciando limpieza completa de la base de datos...');

    try {
        // El orden es importante por las claves foráneas

        console.log('- Borrando logs de dispensación...');
        await prisma.dispensationLog.deleteMany({});

        console.log('- Borrando tareas de dispensación...');
        await prisma.dispensationTask.deleteMany({});

        console.log('- Borrando recordatorios...');
        await prisma.reminder.deleteMany({});

        console.log('- Borrando medicinas...');
        await prisma.medicine.deleteMany({});

        console.log('- Borrando invitaciones...');
        await prisma.invitation.deleteMany({});

        console.log('- Borrando perfiles de pacientes...');
        await prisma.patient.deleteMany({});

        console.log('- Borrando estados y logs del robot...');
        await prisma.robotState.deleteMany({});
        await prisma.robotLog.deleteMany({});
        await prisma.robotInventory.deleteMany({});

        console.log('- Borrando solicitudes de reset de contraseña...');
        await prisma.passwordReset.deleteMany({});

        console.log('- Borrando cuentas de usuarios (PACIENTES)...');
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                role: 'PACIENTE'
            }
        });
        console.log(`  ✅ Se eliminaron ${deletedUsers.count} cuentas de pacientes.`);

        console.log('\n✨ LIMPIEZA COMPLETADA CON ÉXITO');
        console.log('Se han mantenido únicamente las cuentas de los CUIDADORES.');

    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
