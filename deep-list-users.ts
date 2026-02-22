import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('--- DETALLE DE USUARIOS ---');
    users.forEach(u => {
        console.log(`ID: ${u.id} | Email: "${u.email}" | Role: ${u.role}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
