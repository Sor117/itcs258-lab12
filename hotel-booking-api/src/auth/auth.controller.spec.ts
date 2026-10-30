import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    signIn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes registration data to the service', async () => {
    const dto = { username: 'alice', password: 'strong-password' };
    const user = {
      id: 1,
      username: dto.username,
      createdAt: new Date(),
    };
    authService.register.mockResolvedValue(user);

    await expect(controller.register(dto)).resolves.toEqual(user);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('passes login credentials to the service', async () => {
    authService.signIn.mockResolvedValue({ access_token: 'test-token' });

    await expect(
      controller.login({ username: 'alice', password: 'strong-password' }),
    ).resolves.toEqual({ access_token: 'test-token' });
    expect(authService.signIn).toHaveBeenCalledWith('alice', 'strong-password');
  });
});
