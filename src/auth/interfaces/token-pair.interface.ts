import type { UserResponse } from '../../users/interfaces/user-response.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}
