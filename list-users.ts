import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNÓSTICO DE USUARIOS ---');
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                role: true,
                name: true
            }
        });

        if (users.length === 0) {
            console.log('⚠️ No hay usuarios registrados en la base de datos.');
        } else {
            console.log(`✅ Se encontraron ${users.length} usuarios:`);
            users.forEach(u => {
                console.log(`- [${u.role}] ${u.email} (${u.name})`);
            });
        }
    } catch (error) {
        console.error('❌ Error al consultar la base de datos:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
