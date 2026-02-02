import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const result = await (prisma as any).robotState.findMany({
        distinct: ['serialNumber'],
        orderBy: { updatedAt: 'desc' },
        select: { serialNumber: true, updatedAt: true, status: true }
    });

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
