import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/constants/user.constants';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const getAllAndOverride = jest.fn();
  const guard = new RolesGuard({ getAllAndOverride } as unknown as Reflector);

  beforeEach(() => jest.clearAllMocks());

  it('allows an endpoint without a role requirement', () => {
    getAllAndOverride.mockReturnValue(undefined);
    const context = {
      getClass: jest.fn(),
      getHandler: jest.fn(),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows the required role and rejects another authenticated role', () => {
    getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = {
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.ADMIN } }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);

    const userContext = {
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.USER } }),
      }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(userContext)).toThrow('errors.forbidden');
  });
});
