import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const medicines = await prisma.medicine.findMany({
        include: {
            patient: {
                select: {
                    id: true,
                    name: true,
                    robotSerialNumber: true
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log('\n📋 Últimas 10 medicinas:');
    console.log(JSON.stringify(medicines, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
