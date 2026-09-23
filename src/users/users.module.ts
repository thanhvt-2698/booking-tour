import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersController } from './admin-users.controller';
import { UsersController } from './users.controller';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@Module({
  controllers: [AdminUsersController, UsersController],
  exports: [UsersService],
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersService],
})
export class UsersModule {}
