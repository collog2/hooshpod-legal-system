import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EntityType, UserRole } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { DocumentsService } from './documents.service';
import { DocumentsQueryDto } from './dto/documents-query.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents (permission-scoped)' })
  findAll(@Query() query: DocumentsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findAll(query, user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document file' })
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    await this.documentsService.download(id, user, res);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document metadata' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.COUNSEL)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'entityType', 'entityId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        entityType: { type: 'string', enum: Object.values(EntityType) },
        entityId: { type: 'string', format: 'uuid' },
        description: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload document' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: EntityType,
    @Body('entityId') entityId: string,
    @Body('description') description: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!entityType || !entityId) {
      throw new BadRequestException('entityType and entityId are required');
    }

    if (!Object.values(EntityType).includes(entityType)) {
      throw new BadRequestException('Invalid entityType');
    }

    return this.documentsService.create(file, entityType, entityId, description, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.COUNSEL)
  @ApiOperation({ summary: 'Soft-delete document metadata' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.remove(id, user);
  }
}
