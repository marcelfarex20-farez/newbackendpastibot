
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- ULTIMOS LOGS DEL ROBOT ---');
    const robotLogs = await prisma.robotLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.table(robotLogs);

    console.log('\n--- ULTIMAS TAREAS DE DISPENSACION ---');
    const tasks = await prisma.dispensationTask.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.table(tasks);

    console.log('\n--- ULTIMOS LOGS DE DISPENSACION (HISTORIAL) ---');
    const dispensationLogs = await prisma.dispensationLog.findMany({
        orderBy: { dispensedAt: 'desc' },
        take: 10
    });
    console.table(dispensationLogs);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
