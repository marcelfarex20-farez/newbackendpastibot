
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkActivity() {
    const user1 = await (prisma as any).user.findUnique({ where: { id: 1 } });
    const user60 = await (prisma as any).user.findUnique({ where: { id: 60 } });

    console.log("=== USER 1 (amsagbay@sudamericano.edu.ec) ===");
    console.log(`FCM Token: ${user1?.fcmToken ? 'YES' : 'NO'}`);
    console.log(`Created: ${user1?.createdAt.toISOString()}`);

    console.log("\n=== USER 60 (cuidador@pastibot.com) ===");
    console.log(`FCM Token: ${user60?.fcmToken ? 'YES' : 'NO'}`);
    console.log(`Created: ${user60?.createdAt.toISOString()}`);

    const patients1 = await (prisma as any).patient.findMany({ where: { caregiverId: 1 } });
    const patients60 = await (prisma as any).patient.findMany({ where: { caregiverId: 60 } });

    console.log(`\nPacientes de User 1: ${patients1.map((p: any) => p.name).join(', ')}`);
    console.log(`Pacientes de User 60: ${patients60.map((p: any) => p.name).join(', ')}`);
}

checkActivity().finally(() => prisma.$disconnect());
