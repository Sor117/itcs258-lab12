import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import type { JwtPayload } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/RegisterDto.dto';
import { JwtAuthGuard } from './auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with the USER role' })
  @ApiResponse({
    status: 201,
    description: 'The user was created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        username: { type: 'string' },
        role: { type: 'string', enum: ['USER', 'ADMIN'] },
        createdAt: { type: 'string', format: 'date-time' },
      },
      example: {
        id: 3,
        username: 'alice',
        role: 'USER',
        createdAt: '2026-10-21T08:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'The request body failed validation',
  })
  @ApiResponse({ status: 409, description: 'The username is already taken' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Log in and receive a JWT access token' })
  @ApiResponse({
    status: 200,
    description: 'Use access_token with the Authorize button',
    schema: {
      type: 'object',
      properties: { access_token: { type: 'string' } },
      example: { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'The request body failed validation',
  })
  @ApiResponse({ status: 401, description: 'Invalid username or password' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto.username, loginDto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Return the JWT payload of the signed-in user' })
  @ApiResponse({
    status: 200,
    description: 'The verified JWT payload',
    schema: {
      type: 'object',
      properties: {
        sub: { type: 'integer', description: 'User ID' },
        username: { type: 'string' },
        role: { type: 'string', enum: ['USER', 'ADMIN'] },
        iat: { type: 'integer' },
        exp: { type: 'integer' },
      },
      example: {
        sub: 3,
        username: 'alice',
        role: 'USER',
        iat: 1792564200,
        exp: 1792567800,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing, invalid or expired JWT' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
