import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const now = new Date();
    const localDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));

    const startOfDay = new Date(localDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const data = {
        currentTimeUTC: now.toISOString(),
        localTimeGMT5: localDate.toISOString(),
        queryStartOfDay: startOfDay.toISOString(),
        recentLogs: await (prisma as any).dispensationLog.findMany({
            where: {
                dispensedAt: { gte: startOfDay }
            },
            include: { medicine: true },
            orderBy: { dispensedAt: 'desc' },
            take: 10
        }),
        pendingTasks: await (prisma as any).dispensationTask.findMany({
            where: {
                status: 'PENDING'
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        })
    };

    process.stdout.write(JSON.stringify(data, null, 2));
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
