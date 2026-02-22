import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        where: { email: { contains: 'sagbay' } }
    });
    console.log('--- USER DATA ---');
    users.forEach(u => {
        console.log(`ID: ${u.id}, Email: "${u.email}", HasPassword: ${!!u.password}, Provider: ${u.provider}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
