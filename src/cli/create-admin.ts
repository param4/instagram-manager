import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@modules/users/entities/user.entity';
import { AuthService } from '@modules/auth/services/auth.service';
import { UserStatus } from '@modules/users/types/user.type';

/**
 * Standalone CLI script to create the first platform super admin.
 *
 * Usage: pnpm create:admin
 */
async function bootstrap() {
  const logger = new Logger('CreateAdmin');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const rl = readline.createInterface({ input, output });

  try {
    const email = await rl.question('Super admin email: ');
    const name = await rl.question('Super admin name: ');

    if (!email || !name) {
      logger.error('Email and name are required');
      process.exit(1);
    }

    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const authService = app.get(AuthService);

    // Check if any user already exists with this email
    const existing = await userRepo.findOneBy({ email });
    if (existing) {
      if (existing.isSuperAdmin) {
        logger.warn(`Super admin with email "${email}" already exists (ID: ${existing.id})`);
        process.exit(0);
      }
      const upgrade = await rl.question(
        `A user with email "${email}" already exists but is not a super admin. Upgrade to super admin? (y/N): `,
      );
      if (upgrade.toLowerCase() !== 'y') {
        logger.log('Aborted.');
        process.exit(0);
      }
      existing.isSuperAdmin = true;
      existing.status = UserStatus.ACTIVE;
      await userRepo.save(existing);
      logger.log(`User upgraded to super admin successfully!`);
      logger.log(`  ID: ${existing.id}`);
      logger.log(`  Email: ${existing.email}`);
      logger.log(`  Auth Provider ID: ${existing.authProviderId}`);
      return;
    }

    // Collect optional fields for auth provider
    const username = await rl.question(
      'Username (required by some providers, leave empty to skip): ',
    );

    // Retry loop for auth provider user creation
    let authProviderId: string | null = null;
    while (!authProviderId) {
      const password = await rl.question('Password (leave empty for provider default): ');

      try {
        const result = await authService.createUser({
          email,
          name,
          password: password || undefined,
          username: username || undefined,
        });
        authProviderId = result.authProviderId;
        logger.log(`User created in auth provider: ${authProviderId}`);
      } catch (error) {
        const messages: string[] = [];
        if (error && typeof error === 'object' && 'errors' in error) {
          for (const e of error.errors) {
            messages.push(e.longMessage || e.message || e.code);
          }
        } else {
          messages.push(error instanceof Error ? error.message : String(error));
        }
        logger.error(`Auth provider rejected the request:\n  - ${messages.join('\n  - ')}`);

        const retry = await rl.question('Try a different password? (Y/n): ');
        if (retry.toLowerCase() === 'n') {
          logger.error('Cannot create super admin without auth provider registration. Aborting.');
          process.exit(1);
        }
      }
    }

    // Create local super admin record only after auth provider succeeds
    const user = userRepo.create({
      businessId: null,
      authProviderId,
      email,
      name,
      isSuperAdmin: true,
      status: UserStatus.ACTIVE,
    });

    const saved = await userRepo.save(user);
    logger.log(`Super admin created successfully!`);
    logger.log(`  ID: ${saved.id}`);
    logger.log(`  Email: ${saved.email}`);
    logger.log(`  Auth Provider ID: ${saved.authProviderId}`);
  } finally {
    rl.close();
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error('Failed to create super admin:', err);
  process.exit(1);
});
