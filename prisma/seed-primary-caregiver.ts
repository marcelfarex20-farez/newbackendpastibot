import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const password = 'FAREZ5119';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Seed both sagabay and sagbay variants to be safe
    const emails = ['sagabayanthony19@gmail.com', 'sagbayanthony19@gmail.com'];

    for (const email of emails) {
        await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: 'CUIDADOR',
                name: 'Anthony Sagbay (Caregiver)',
            },
            create: {
                email,
                password: hashedPassword,
                name: 'Anthony Sagbay (Caregiver)',
                role: 'CUIDADOR',
                verified: true,
                provider: 'local',
            },
        });
        console.log('✅ Caregiver configured:', email);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
