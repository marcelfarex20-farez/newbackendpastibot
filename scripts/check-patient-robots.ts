import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n📋 Pacientes y sus robots:');
    const patients = await prisma.patient.findMany({
        select: {
            id: true,
            name: true,
            robotSerialNumber: true
        }
    });
    console.log(JSON.stringify(patients, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
