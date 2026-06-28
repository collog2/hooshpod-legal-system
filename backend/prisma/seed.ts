import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const users = [
  {
    email: 'admin@hooshpod.com',
    password: 'Admin123!',
    firstName: 'System',
    lastName: 'Admin',
    role: UserRole.ADMIN,
  },
  {
    email: 'manager@hooshpod.com',
    password: 'Manager123!',
    firstName: 'Legal',
    lastName: 'Manager',
    role: UserRole.MANAGER,
  },
  {
    email: 'counsel1@hooshpod.com',
    password: 'Counsel123!',
    firstName: 'Alice',
    lastName: 'Counsel',
    role: UserRole.COUNSEL,
  },
  {
    email: 'counsel2@hooshpod.com',
    password: 'Counsel123!',
    firstName: 'Bob',
    lastName: 'Counsel',
    role: UserRole.COUNSEL,
  },
  {
    email: 'viewer@hooshpod.com',
    password: 'Viewer123!',
    firstName: 'Read',
    lastName: 'Viewer',
    role: UserRole.VIEWER,
  },
];

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: true,
        deletedAt: null,
      },
      create: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
