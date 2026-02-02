import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const data = {
        heartbeats: await (prisma as any).robotState.findMany({
            where: { serialNumber: 'esp32pastibot' },
            orderBy: { updatedAt: 'desc' },
            take: 3
        }),
        linkedPatients: await (prisma as any).patient.findMany({
            where: { robotSerialNumber: 'esp32pastibot' },
            include: { caregiver: { select: { email: true, name: true } } }
        }),
        activeRobots: await (prisma as any).robotState.findMany({
            distinct: ['serialNumber'],
            orderBy: { updatedAt: 'desc' },
            select: { serialNumber: true, updatedAt: true }
        })
    };

    process.stdout.write(JSON.stringify(data, null, 2));
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
