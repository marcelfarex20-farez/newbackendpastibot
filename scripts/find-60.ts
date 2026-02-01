
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findCaringUsers() {
    const users = await (prisma as any).user.findMany({
        where: { role: 'CUIDADOR' }
    });

    console.log("=== ALL CAREGIVERS ===");
    users.forEach((u: any) => {
        console.log(`ID: ${u.id}, Name: "${u.name}", Email: ${u.email}`);
    });

    const user60 = await (prisma as any).user.findUnique({ where: { id: 60 } });
    if (user60) {
        console.log("\n=== USER 60 DETAILS ===");
        console.log(JSON.stringify(user60, null, 2));
    }
}

findCaringUsers().finally(() => prisma.$disconnect());
