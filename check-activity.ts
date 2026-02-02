import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- REPORTE DE ACTIVIDAD RECIENTE ---');

    const lastStates = await (prisma as any).robotState.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10
    });

    const lastLogs = await (prisma as any).robotLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    const report = {
        now: new Date().toISOString(),
        states: lastStates.map((s: any) => ({
            serial: s.serialNumber,
            updatedAt: s.updatedAt,
            status: s.status,
            diff_seconds: (new Date().getTime() - new Date(s.updatedAt).getTime()) / 1000
        })),
        logs: lastLogs.map((l: any) => ({
            msg: l.message,
            at: l.createdAt
        }))
    };

    process.stdout.write(JSON.stringify(report, null, 2));
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
