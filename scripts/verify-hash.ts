import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'sagabayanthony19@gmail.com';
    const password = 'FAREZ5119';

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user || !user.password) {
        console.error('User not found or no password');
        return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`--- Verification for ${email} ---`);
    console.log(`Password: ${password}`);
    console.log(`Hash in DB: ${user.password}`);
    console.log(`Match Result: ${isMatch}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
