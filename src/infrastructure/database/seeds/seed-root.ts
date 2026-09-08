import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { z } from 'zod';
import dataSource from '../data-source.js';
import { UserOrmEntity } from '../entities/user.orm-entity.js';
import { UserRole } from '../../../domain/users/user-role-permissions.js';

const seedEnvSchema = z.object({
  ROOT_EMAIL: z.email().default('root@example.com'),
  ROOT_USERNAME: z.string().min(5).default('rootuser'),
  ROOT_PASSWORD: z.string().min(8).default('SuperAdmin123!'),
});

const seedEnv = seedEnvSchema.parse(process.env);

async function seedRoot() {
  console.log('🔄 Connecting to database...');
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(UserOrmEntity);

  const rootEmail = seedEnv.ROOT_EMAIL;
  const rootUsername = seedEnv.ROOT_USERNAME;
  const rootPassword = seedEnv.ROOT_PASSWORD;

  try {
    const existingRoot = await userRepo.findOne({
      where: [{ email: rootEmail }, { username: rootUsername }],
    });

    if (existingRoot) {
      console.log(
        `⚠️ Root user already exists: ${existingRoot.email} (ID: ${existingRoot.id})`,
      );
      return;
    }

    const passwordHash = await argon2.hash(rootPassword);

    const rootUser = userRepo.create({
      id: randomUUID(),
      username: rootUsername,
      email: rootEmail,
      passwordHash,
      role: UserRole.ROOT,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await userRepo.save(rootUser);

    console.log('✅ ROOT user created successfully:');
    console.log(`   Email   : ${rootEmail}`);
    console.log(`   Username: ${rootUsername}`);
    console.log(`   Password: ${rootPassword}`);
    console.log(`   Role    : ${UserRole.ROOT}`);
  } catch (error) {
    console.error('❌ Failed to seed ROOT user:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed.');
  }
}

void seedRoot();
