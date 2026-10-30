import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  sub: number;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

type AuthenticatedRequest = Request & { user?: JwtPayload };

export const CurrentUser = createParamDecorator(
  (property: keyof JwtPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    return property && user ? user[property] : user;
  },
);
