
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function showEmail() {
    const user = await (prisma as any).user.findUnique({ where: { id: 60 } });
    if (user) {
        console.log(`ID: ${user.id}`);
        console.log(`EMAIL: ${user.email}`);
        console.log(`NAME: ${user.name}`);
    } else {
        console.log("User 60 not found.");
    }
}

showEmail().finally(() => prisma.$disconnect());
