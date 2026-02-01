
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function simulateStatus(userId: number) {
    console.log(`=== SIMULATING STATUS FOR USER ID: ${userId} ===`);

    const patientWithRobot = await (prisma as any).patient.findFirst({
        where: {
            caregiverId: userId,
            robotSerialNumber: { not: null }
        },
        select: { robotSerialNumber: true, name: true }
    });

    if (patientWithRobot) {
        console.log(`INFERRED ROBOT: "${patientWithRobot.robotSerialNumber}" FROM PATIENT: ${patientWithRobot.name}`);

        const state = await (prisma as any).robotState.findFirst({
            where: { serialNumber: patientWithRobot.robotSerialNumber },
            orderBy: { updatedAt: 'desc' }
        });

        if (state) {
            console.log(`STATE FOUND: OK (Updated: ${state.updatedAt.toISOString()})`);
            console.log(JSON.stringify(state, null, 2));
        } else {
            console.log("STATE NOT FOUND IN DB.");
        }
    } else {
        console.log("NO PATIENT WITH ROBOT FOUND FOR THIS USER.");
    }
}

async function run() {
    await simulateStatus(1);
    await simulateStatus(60);
    await prisma.$disconnect();
}

run();
