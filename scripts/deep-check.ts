
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deepCheck() {
    const caregivers = await (prisma as any).user.findMany({
        where: { role: 'CUIDADOR' },
        include: {
            patients: true
        }
    });

    console.log("=== RELACIONES DE CUIDADORES ===");
    for (const c of caregivers) {
        console.log(`\n👨‍⚕️ Cuidador: ${c.name} (${c.email}, ID: ${c.id})`);
        if (c.patients.length === 0) {
            console.log("   (Sin pacientes vinculados)");
        }
        for (const p of c.patients) {
            console.log(`   - 👤 Paciente: ${p.name} (ID: ${p.id})`);
            console.log(`     🤖 Robot Serial: [${p.robotSerialNumber || 'NINGUNO'}]`);
        }
    }
}

deepCheck();
