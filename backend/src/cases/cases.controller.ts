import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CasesQueryDto } from './dto/cases-query.dto';
import { ReassignCaseOwnerDto } from './dto/reassign-owner.dto';

@ApiTags('cases')
@ApiBearerAuth()
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @ApiOperation({ summary: 'List cases (permission-scoped)' })
  findAll(@Query() query: CasesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.casesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.casesService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.COUNSEL)
  @ApiOperation({ summary: 'Create case' })
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.casesService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update case' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.casesService.update(id, dto, user);
  }

  @Patch(':id/owner')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reassign case ownership' })
  reassignOwner(
    @Param('id') id: string,
    @Body() dto: ReassignCaseOwnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.casesService.reassignOwner(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.COUNSEL)
  @ApiOperation({ summary: 'Soft-delete case' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.casesService.remove(id, user);
  }
}
