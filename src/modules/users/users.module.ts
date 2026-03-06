import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserHierarchy } from './entities/user-hierarchy.entity';
import { UserRole } from '@modules/authorization/entities/user-role.entity';
import { Role } from '@modules/authorization/entities/role.entity';
import { Business } from '@modules/business/entities/business.entity';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserHierarchy, UserRole, Role, Business])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
