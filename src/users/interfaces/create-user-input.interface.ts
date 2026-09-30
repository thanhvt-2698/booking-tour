import { UserRole } from '../constants/user.constants';

export interface CreateUserInput {
  avatarUrl?: string;
  email: string;
  passwordHash: string | null;
  role?: UserRole;
}
