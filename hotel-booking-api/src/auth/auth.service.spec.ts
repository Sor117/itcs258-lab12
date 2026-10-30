import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    create: jest.fn(),
    findOne: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes a password with 12 rounds when registering', async () => {
    let storedPassword = '';
    usersService.create.mockImplementation(
      (username: string, password: string) => {
        storedPassword = password;
        return Promise.resolve({
          id: 1,
          username,
          password,
          role: Role.USER,
          createdAt: new Date(),
        });
      },
    );

    const result = await service.register({
      username: 'alice',
      password: 'strong-password',
    });

    expect(storedPassword).not.toBe('strong-password');
    expect(Number(storedPassword.split('$')[2])).toBe(12);
    await expect(
      bcrypt.compare('strong-password', storedPassword),
    ).resolves.toBe(true);
    expect(result).not.toHaveProperty('password');
    expect(result.role).toBe(Role.USER);
  });

  it('returns a JWT for valid credentials', async () => {
    const password = await bcrypt.hash('strong-password', 4);
    usersService.findOne.mockResolvedValue({
      id: 7,
      username: 'alice',
      password,
      role: Role.ADMIN,
      createdAt: new Date(),
    });
    jwtService.signAsync.mockResolvedValue('test-token');

    await expect(service.signIn('alice', 'strong-password')).resolves.toEqual({
      access_token: 'test-token',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 7,
      username: 'alice',
      role: Role.ADMIN,
    });
  });

  it('rejects invalid credentials', async () => {
    usersService.findOne.mockResolvedValue(null);

    await expect(service.signIn('alice', 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
