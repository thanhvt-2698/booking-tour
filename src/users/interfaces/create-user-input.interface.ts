import { UserRole } from '../constants/user.constants';

export interface CreateUserInput {
  email: string;
  passwordHash: string | null;
  role?: UserRole;
}
