import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    console.log(`--- SIMULANDO QUERY PARA: "${email}" ---`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (user) {
        console.log('✅ USUARIO ENCONTRADO:');
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log('❌ USUARIO NO ENCONTRADO');
    }
}

async function main() {
    await testQuery('sagbayanthony19@gmail.com');
}

main().catch(console.error).finally(() => prisma.$disconnect());
