import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import type { UserResponse } from './user-response.interface';

export interface AdminUserList {
  meta: PaginationMeta;
  users: UserResponse[];
}
