
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkExactString() {
    const patient = await (prisma as any).patient.findFirst({
        where: { robotSerialNumber: { not: null } }
    });

    if (patient) {
        const s = patient.robotSerialNumber;
        console.log(`Serial: "${s}"`);
        console.log(`Length: ${s.length}`);
        for (let i = 0; i < s.length; i++) {
            console.log(`Char ${i}: ${s.charCodeAt(i)} ('${s[i]}')`);
        }
    }
}

checkExactString();
