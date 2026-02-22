import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const password = '123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Limpiar todos los usuarios previos para asegurar cuidador único
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany();

    const admin = await prisma.user.create({
        data: {
            email: 'admin',
            name: 'Administrador Pastibot',
            password: hashedPassword,
            role: 'CUIDADOR',
            provider: 'email',
            verified: true,
            gender: 'Masculino',
            bio: 'Único administrador y cuidador del sistema.',
            photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
            sharingCode: 'PASTIBOT',
        } as any,
    });

    console.log('--- SISTEMA REINICIADO ---');
    console.log('Único Cuidador Creado:');
    console.log(`Email/Usuario: ${admin.email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
