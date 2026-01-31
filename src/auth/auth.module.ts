import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseService } from './firebase.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt.guard';

import { GoogleStrategy } from './google.strategy';
import { FacebookStrategy } from './facebook.strategy';
import { XStrategy } from './x.strategy';

import { PrismaModule } from '../prisma/prisma.module';
import { GoogleAuthGuard } from './google.guard';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey-pastibot',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    FirebaseService,
    JwtStrategy,
    JwtAuthGuard,

    // OAUTH STRATEGIES
    GoogleStrategy,
    // FacebookStrategy,
    // XStrategy,

    // CUSTOM GUARDS
    GoogleAuthGuard,
  ],
  exports: [AuthService, FirebaseService],
})
export class AuthModule { }
