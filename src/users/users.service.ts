import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async getMe(userId: number) {
    const user = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      include: {
        patients: true,
        Medicine: true,
        patientProfile: {
          include: {
            caregiver: {
              select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
                gender: true,
                bio: true,
                phone: true // 👈 AGREGADO
              }
            }
          }
        },
      },
    });


    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateUserDto) {
    const user = await (this.prisma.user as any).update({
      where: { id: userId },
      data: dto,
    });

    return user;
  }
}