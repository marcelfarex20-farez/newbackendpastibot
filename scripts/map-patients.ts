
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listAllPatientsAndCaregivers() {
    const patients = await (prisma as any).patient.findMany({
        include: {
            caregiver: true
        }
    });

    console.log("=== LISTA DE PACIENTES Y SUS CUIDADORES ===");
    patients.forEach((p: any) => {
        console.log(`Paciente: ${p.name} (ID: ${p.id})`);
        console.log(`- Serial del Robo: "${p.robotSerialNumber}"`);
        if (p.caregiver) {
            console.log(`- Cuidador: ${p.caregiver.name} (ID: ${p.caregiver.id}) Email: ${p.caregiver.email}`);
        } else {
            console.log(`- Cuidador: NINGUNO (caregiverId is null)`);
        }
        console.log("-------------------");
    });
}

listAllPatientsAndCaregivers();
