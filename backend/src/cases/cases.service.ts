import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/services/access.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CasesQueryDto } from './dto/cases-query.dto';
import { ReassignCaseOwnerDto } from './dto/reassign-owner.dto';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async findAll(
    query: CasesQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CaseWhereInput = {
      deletedAt: null,
      ...this.ownership.ownershipFilter(user),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.ownerId && this.ownership.canReadAll(user) ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { referenceCode: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, cases] = await Promise.all([
      this.prisma.case.count({ where }),
      this.prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.caseSelect,
      }),
    ]);

    return {
      data: cases,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const record = await this.prisma.case.findFirst({
      where: { id, deletedAt: null },
      select: this.caseSelect,
    });

    if (!record) {
      throw new NotFoundException('Case not found');
    }

    this.ownership.assertRead(user, record.ownerId);
    return record;
  }

  async create(dto: CreateCaseDto, user: AuthenticatedUser) {
    if (!this.ownership.canCreateCase(user)) {
      throw new ForbiddenException('You do not have permission to create cases');
    }

    const ownerId = this.resolveOwnerIdForCreate(dto.ownerId, user);

    await this.ensureReferenceCodeAvailable(dto.referenceCode);
    await this.ensureOwnerExists(ownerId);

    return this.prisma.case.create({
      data: {
        title: dto.title,
        referenceCode: dto.referenceCode,
        type: dto.type,
        status: dto.status,
        priority: dto.priority,
        ownerId,
        involvedParties: (dto.involvedParties ?? []) as unknown as Prisma.InputJsonValue,
        description: dto.description,
        openedDate: dto.openedDate ? new Date(dto.openedDate) : undefined,
        closedDate: dto.closedDate ? new Date(dto.closedDate) : undefined,
        createdById: user.id,
        updatedById: user.id,
      },
      select: this.caseSelect,
    });
  }

  async update(id: string, dto: UpdateCaseDto, user: AuthenticatedUser) {
    const existing = await this.findOne(id, user);
    this.ownership.assertWrite(user, existing.ownerId);

    if (dto.referenceCode && dto.referenceCode !== existing.referenceCode) {
      await this.ensureReferenceCodeAvailable(dto.referenceCode, id);
    }

    if (dto.ownerId && dto.ownerId !== existing.ownerId) {
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
        throw new ForbiddenException('Only administrators can reassign ownership here');
      }

      await this.ensureOwnerExists(dto.ownerId);
    }

    const ownerId =
      dto.ownerId && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER)
        ? dto.ownerId
        : existing.ownerId;

    return this.prisma.case.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.referenceCode !== undefined ? { referenceCode: dto.referenceCode } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ownerId,
        ...(dto.involvedParties !== undefined
          ? { involvedParties: dto.involvedParties as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.openedDate !== undefined
          ? { openedDate: dto.openedDate ? new Date(dto.openedDate) : null }
          : {}),
        ...(dto.closedDate !== undefined
          ? { closedDate: dto.closedDate ? new Date(dto.closedDate) : null }
          : {}),
        updatedById: user.id,
      },
      select: this.caseSelect,
    });
  }

  async reassignOwner(id: string, dto: ReassignCaseOwnerDto, user: AuthenticatedUser) {
    await this.findOne(id, user);
    await this.ensureOwnerExists(dto.ownerId);

    return this.prisma.case.update({
      where: { id },
      data: {
        ownerId: dto.ownerId,
        updatedById: user.id,
      },
      select: this.caseSelect,
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.findOne(id, user);
    this.ownership.assertWrite(user, existing.ownerId);

    return this.prisma.case.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: user.id },
      select: this.caseSelect,
    });
  }

  private resolveOwnerIdForCreate(ownerId: string | undefined, user: AuthenticatedUser): string {
    if (this.ownership.canReadAll(user)) {
      return ownerId ?? user.id;
    }

    return user.id;
  }

  private async ensureReferenceCodeAvailable(referenceCode: string, excludeId?: string) {
    const existing = await this.prisma.case.findFirst({
      where: {
        referenceCode,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Reference code already in use');
    }
  }

  private async ensureOwnerExists(ownerId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { id: ownerId, deletedAt: null, isActive: true },
    });

    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
  }

  private readonly caseSelect = {
    id: true,
    title: true,
    referenceCode: true,
    type: true,
    status: true,
    priority: true,
    ownerId: true,
    involvedParties: true,
    description: true,
    openedDate: true,
    closedDate: true,
    createdById: true,
    updatedById: true,
    createdAt: true,
    updatedAt: true,
    owner: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  } satisfies Prisma.CaseSelect;
}
