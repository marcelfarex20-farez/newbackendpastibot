import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({
        where: { id: 3 }
    });
    if (user) {
        console.log(`- Email original: "${user.email}"`);
        console.log(`- Longitud: ${user.email.length}`);
        console.log(`- Char Codes: ${[...user.email].map(c => c.charCodeAt(0)).join(',')}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
