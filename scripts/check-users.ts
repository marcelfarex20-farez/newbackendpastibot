
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUsers() {
    const users = await (prisma as any).user.findMany({
        where: { email: { contains: 'amsagbay' } }
    });

    console.log(`=== FOUND ${users.length} USERS ===`);
    users.forEach((u: any) => {
        console.log(`ID: ${u.id}, Email: ${u.email}, Name: "${u.name}", Role: ${u.role}`);
    });
}

checkUsers().finally(() => prisma.$disconnect());
