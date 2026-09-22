import { UserRole, UserStatus } from '../constants/user.constants';

export interface UserResponse {
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  email: string;
  id: string;
  role: UserRole;
  status: UserStatus;
  updatedAt: Date;
  username: string;
}
