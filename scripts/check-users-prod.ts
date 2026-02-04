import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DB Check ---');
    const users = await prisma.user.findMany({
        select: {
            email: true,
            role: true,
            provider: true,
            name: true
        }
    });
    console.log('Users found in DB:', JSON.stringify(users, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
