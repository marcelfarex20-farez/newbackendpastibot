
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fullDump() {
    const users = await prisma.user.findMany();
    const patients = await prisma.patient.findMany();
    const states = await (prisma as any).robotState.findMany();

    console.log(JSON.stringify({ users, patients, states }, null, 2));
}

fullDump();
