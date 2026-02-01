import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function linkAllAnthonys() {
    const serial = "esp32pastibot";

    const result = await prisma.patient.updateMany({
        where: {
            name: { contains: "ANTHONY", mode: 'insensitive' }
        },
        data: {
            robotSerialNumber: serial
        }
    });

    console.log(`✅ Se vincularon ${result.count} cuentas de Anthony al robot: ${serial}`);
}

linkAllAnthonys().catch(console.error).finally(() => prisma.$disconnect());
