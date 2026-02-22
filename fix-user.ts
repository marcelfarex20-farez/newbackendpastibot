import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
    console.log('--- REPARANDO USUARIO ---');
    // 1. Borrar el usuario con el typo si existe
    await prisma.user.deleteMany({
        where: { email: 'sagabayanthony19@gmail.com' }
    });

    // 2. Asegurar que el usuario correcto tenga el password correcto
    const hashedPassword = await bcrypt.hash('pastibot2026', 10);
    const user = await prisma.user.update({
        where: { email: 'sagbayanthony19@gmail.com' },
        data: {
            password: hashedPassword,
            role: 'CUIDADOR'
        }
    });

    console.log('✅ Usuario reparado:', user.email);
    console.log('🔑 Password temporal: pastibot2026');
}
main().catch(console.error).finally(() => prisma.$disconnect());
