/**
 * Quick script to:
 * 1. Insert super admin into DB
 * 2. Create a Clerk sign-in token to get a JWT session
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@modules/users/entities/user.entity';
import { UserStatus } from '@modules/users/types/user.type';

async function bootstrap() {
  const logger = new Logger('SeedAndToken');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

    const clerkUserId = 'user_3AX7dhJBp0WqNLXTxNNmuj3uqxt';

    // Check if already exists
    let user = await userRepo.findOneBy({ authProviderId: clerkUserId });
    if (!user) {
      user = userRepo.create({
        businessId: null,
        authProviderId: clerkUserId,
        email: 'superadmin@test.com',
        name: 'Super Admin',
        isSuperAdmin: true,
        status: UserStatus.ACTIVE,
      });
      user = await userRepo.save(user);
      logger.log(`Super admin created in DB: ${user.id}`);
    } else {
      logger.log(`Super admin already exists: ${user.id}`);
    }

    // Now get a Clerk sign-in token
    const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sk_test_QZsbnJjwHVGPpP0RU4q9VGaMI7wkDtwSTG3j6bfouO',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: clerkUserId }),
    });

    const data = await res.json();
    logger.log('Sign-in token created:');
    console.log(JSON.stringify(data, null, 2));
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
