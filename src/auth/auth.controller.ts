import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { GoogleAuthGuard } from './google.guard';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { UserService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) { }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.registerLocal(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.loginLocal(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Req() req: any) {
    return this.userService.getMe(req.user.id);
  }

  // =====================================================
  // FIREBASE SYNC (Native)
  // =====================================================
  @Post('firebase-login')
  async firebaseLogin(@Body('idToken') idToken: string) {
    return this.authService.firebaseLogin(idToken);
  }

  @Post('firebase-register')
  async firebaseRegister(@Body() dto: any) {
    return this.authService.firebaseRegister(dto);
  }

  // =====================================================
  // GOOGLE LOGIN
  // =====================================================
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() { }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleRedirect(@Req() req: any, @Res() res: Response) {
    console.log('🏁 Iniciando proceso de redirección Google OAuth para:', req.user?.email);
    const auth = await this.authService.loginFromOAuth(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';

    const redirectBase = frontendUrl.includes('://') ? frontendUrl : `${frontendUrl}://`;
    const finalUrl = `${redirectBase}social-success?token=${auth.accessToken}${auth.firebaseToken ? `&firebaseToken=${auth.firebaseToken}` : ''}`;

    console.log('🚀 Redirigiendo a la App:', finalUrl);
    return res.redirect(finalUrl);
  }

  // =====================================================
  // FACEBOOK LOGIN
  // =====================================================
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookLogin() { }

  @Get('facebook/redirect')
  @UseGuards(AuthGuard('facebook'))
  async facebookRedirect(@Req() req: any, @Res() res: Response) {
    const auth = await this.authService.loginFromOAuth(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';
    const redirectBase = frontendUrl.includes('://') ? frontendUrl : `${frontendUrl}://`;

    return res.redirect(
      `${redirectBase}social-success?token=${auth.accessToken}${auth.firebaseToken ? `&firebaseToken=${auth.firebaseToken}` : ''}`,
    );
  }

  // =====================================================
  // X / TWITTER LOGIN
  // =====================================================
  @Get('x')
  @UseGuards(AuthGuard('x'))
  xLogin() { }

  @Get('x/redirect')
  @UseGuards(AuthGuard('x'))
  async xRedirect(@Req() req: any, @Res() res: Response) {
    const auth = await this.authService.loginFromOAuth(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';
    const redirectBase = frontendUrl.includes('://') ? frontendUrl : `${frontendUrl}://`;

    return res.redirect(
      `${redirectBase}social-success?token=${auth.accessToken}${auth.firebaseToken ? `&firebaseToken=${auth.firebaseToken}` : ''}`,
    );
  }

  // =====================================================
  // SET PASSWORD (POST GOOGLE)
  // =====================================================
  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  async setPassword(@Req() req: any, @Body('password') password: string) {
    return this.authService.setPassword(req.user.id, password);
  }

  // =====================================================
  // 🚀 SET ROLE DESPUÉS DEL LOGIN SOCIAL
  // =====================================================
  @Post('set-role')
  @UseGuards(JwtAuthGuard)
  async setRole(@Req() req: any, @Body('role') role: Role, @Body('caregiverCode') caregiverCode?: string) {
    return this.authService.setRole(req.user.id, role, caregiverCode);
  }

  // =====================================================
  // FORGOT PASSWORD
  // =====================================================
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  // =====================================================
  // RESET PASSWORD
  // =====================================================
  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }
}

