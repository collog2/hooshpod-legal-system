import {
  CasePriority,
  CaseStatus,
  CaseType,
  EntityType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const uploadDir = process.env.UPLOAD_DIR ?? './uploads';

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
  const seededUsers: Record<string, string> = {};

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    const record = await prisma.user.upsert({
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

    seededUsers[user.email] = record.id;
  }

  const adminId = seededUsers['admin@hooshpod.com'];
  const counsel1Id = seededUsers['counsel1@hooshpod.com'];
  const counsel2Id = seededUsers['counsel2@hooshpod.com'];

  const sampleCases = [
    {
      referenceCode: 'CASE-2024-001',
      title: 'Acme Corp v. State Regulatory Board',
      type: CaseType.REGULATORY,
      status: CaseStatus.IN_PROGRESS,
      priority: CasePriority.HIGH,
      ownerId: counsel1Id,
      description: 'Administrative appeal regarding licensing decision.',
      involvedParties: [{ name: 'Acme Corp', role: 'Plaintiff' }],
    },
    {
      referenceCode: 'CASE-2024-002',
      title: 'Smith Employment Dispute',
      type: CaseType.LITIGATION,
      status: CaseStatus.OPEN,
      priority: CasePriority.MEDIUM,
      ownerId: counsel1Id,
      description: 'Wrongful termination claim pending discovery.',
      involvedParties: [{ name: 'Jane Smith', role: 'Claimant' }],
    },
    {
      referenceCode: 'CASE-2024-003',
      title: 'Northwind Vendor Contract Breach',
      type: CaseType.ARBITRATION,
      status: CaseStatus.ON_HOLD,
      priority: CasePriority.CRITICAL,
      ownerId: counsel2Id,
      description: 'Arbitration proceedings for supply agreement breach.',
      involvedParties: [{ name: 'Northwind LLC', role: 'Respondent' }],
    },
  ];

  const caseRecords = [];

  for (const sample of sampleCases) {
    const record = await prisma.case.upsert({
      where: { referenceCode: sample.referenceCode },
      update: {
        title: sample.title,
        type: sample.type,
        status: sample.status,
        priority: sample.priority,
        ownerId: sample.ownerId,
        description: sample.description,
        involvedParties: sample.involvedParties,
        updatedById: adminId,
        deletedAt: null,
      },
      create: {
        ...sample,
        openedDate: new Date('2024-01-15'),
        createdById: adminId,
        updatedById: adminId,
      },
    });

    caseRecords.push(record);
  }

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const sampleDocuments = [
    {
      caseReference: 'CASE-2024-001',
      originalFilename: 'regulatory-notice.pdf',
      content: 'Sample regulatory notice document.',
      description: 'Initial regulatory notice',
      uploadedById: counsel1Id,
    },
    {
      caseReference: 'CASE-2024-003',
      originalFilename: 'arbitration-brief.pdf',
      content: 'Sample arbitration brief document.',
      description: 'Draft arbitration brief',
      uploadedById: counsel2Id,
    },
  ];

  for (const sample of sampleDocuments) {
    const linkedCase = caseRecords.find((item) => item.referenceCode === sample.caseReference);

    if (!linkedCase) {
      continue;
    }

    const storedFilename = `${linkedCase.referenceCode.toLowerCase()}-seed.pdf`;
    const filePath = join(uploadDir, storedFilename);
    writeFileSync(filePath, sample.content, 'utf8');

    await prisma.document.upsert({
      where: { storedFilename },
      update: {
        originalFilename: sample.originalFilename,
        mimeType: 'application/pdf',
        size: Buffer.byteLength(sample.content, 'utf8'),
        entityType: EntityType.CASE,
        entityId: linkedCase.id,
        uploadedById: sample.uploadedById,
        description: sample.description,
        deletedAt: null,
      },
      create: {
        originalFilename: sample.originalFilename,
        storedFilename,
        mimeType: 'application/pdf',
        size: Buffer.byteLength(sample.content, 'utf8'),
        entityType: EntityType.CASE,
        entityId: linkedCase.id,
        uploadedById: sample.uploadedById,
        description: sample.description,
      },
    });
  }

  console.log(`Seeded ${users.length} users, ${sampleCases.length} cases, ${sampleDocuments.length} documents.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
