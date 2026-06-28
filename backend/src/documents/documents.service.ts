import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityType, Prisma, UserRole } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  OwnershipService,
  PolymorphicEntityService,
} from '../common/services/access.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { DocumentsQueryDto } from './dto/documents-query.dto';
import { getStoredFilePath } from './documents.storage';

@Injectable()
export class DocumentsService {
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly polymorphic: PolymorphicEntityService,
    configService: ConfigService,
  ) {
    this.uploadDir = configService.get<string>('UPLOAD_DIR', './uploads');
  }

  async findAll(
    query: DocumentsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const accessFilter = await this.polymorphic.accessibleDocumentFilter(user);

    const where: Prisma.DocumentWhereInput = {
      deletedAt: null,
      ...accessFilter,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.search
        ? {
            OR: [
              { originalFilename: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadDate: 'desc' },
        select: this.documentSelect,
      }),
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: this.documentSelect,
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.polymorphic.assertEntityReadAccess(user, document.entityType, document.entityId);
    return document;
  }

  async create(
    file: Express.Multer.File,
    entityType: EntityType,
    entityId: string,
    description: string | undefined,
    user: AuthenticatedUser,
  ) {
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot upload documents');
    }

    await this.polymorphic.assertEntityWriteAccess(user, entityType, entityId);

    return this.prisma.document.create({
      data: {
        originalFilename: file.originalname,
        storedFilename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        entityType,
        entityId,
        uploadedById: user.id,
        description,
      },
      select: this.documentSelect,
    });
  }

  async download(id: string, user: AuthenticatedUser, res: Response) {
    const document = await this.findOne(id, user);
    const filePath = getStoredFilePath(this.uploadDir, document.storedFilename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.originalFilename)}"`,
    );

    createReadStream(filePath).pipe(res);
  }

  async remove(id: string, user: AuthenticatedUser) {
    const document = await this.findOne(id, user);
    await this.polymorphic.assertEntityWriteAccess(
      user,
      document.entityType,
      document.entityId,
    );

    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: this.documentSelect,
    });
  }

  private readonly documentSelect = {
    id: true,
    originalFilename: true,
    storedFilename: true,
    mimeType: true,
    size: true,
    entityType: true,
    entityId: true,
    uploadedById: true,
    description: true,
    uploadDate: true,
    createdAt: true,
    updatedAt: true,
    uploadedBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  } satisfies Prisma.DocumentSelect;
}
