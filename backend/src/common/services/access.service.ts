import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  canReadAll(user: AuthenticatedUser): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  }

  canRead(user: AuthenticatedUser, ownerId: string): boolean {
    if (this.canReadAll(user)) {
      return true;
    }

    return ownerId === user.id;
  }

  canWrite(user: AuthenticatedUser, ownerId: string): boolean {
    if (user.role === UserRole.VIEWER) {
      return false;
    }

    if (this.canReadAll(user)) {
      return true;
    }

    return user.role === UserRole.COUNSEL && ownerId === user.id;
  }

  canCreateCase(user: AuthenticatedUser): boolean {
    return user.role !== UserRole.VIEWER;
  }

  assertRead(user: AuthenticatedUser, ownerId: string): void {
    if (!this.canRead(user, ownerId)) {
      throw new ForbiddenException('You do not have access to this record');
    }
  }

  assertWrite(user: AuthenticatedUser, ownerId: string): void {
    if (!this.canWrite(user, ownerId)) {
      throw new ForbiddenException('You do not have permission to modify this record');
    }
  }

  ownershipFilter(user: AuthenticatedUser): { ownerId?: string } {
    if (this.canReadAll(user)) {
      return {};
    }

    return { ownerId: user.id };
  }
}

@Injectable()
export class PolymorphicEntityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async resolveOwnerId(entityType: EntityType, entityId: string): Promise<string> {
    if (entityType === EntityType.CASE) {
      const record = await this.prisma.case.findFirst({
        where: { id: entityId, deletedAt: null },
        select: { ownerId: true },
      });

      if (!record) {
        throw new NotFoundException('Linked case not found');
      }

      return record.ownerId;
    }

    throw new NotFoundException(`Entity type ${entityType} is not supported yet`);
  }

  async assertEntityReadAccess(
    user: AuthenticatedUser,
    entityType: EntityType,
    entityId: string,
  ): Promise<void> {
    const ownerId = await this.resolveOwnerId(entityType, entityId);
    this.ownership.assertRead(user, ownerId);
  }

  async assertEntityWriteAccess(
    user: AuthenticatedUser,
    entityType: EntityType,
    entityId: string,
  ): Promise<void> {
    const ownerId = await this.resolveOwnerId(entityType, entityId);
    this.ownership.assertWrite(user, ownerId);
  }

  async accessibleDocumentFilter(user: AuthenticatedUser) {
    if (this.ownership.canReadAll(user)) {
      return {};
    }

    const cases = await this.prisma.case.findMany({
      where: { deletedAt: null, ownerId: user.id },
      select: { id: true },
    });

    const caseIds = cases.map((item) => item.id);

    return {
      OR: [{ entityType: EntityType.CASE, entityId: { in: caseIds } }],
    };
  }
}
