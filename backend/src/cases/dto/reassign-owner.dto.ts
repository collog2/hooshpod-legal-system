import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReassignCaseOwnerDto {
  @ApiProperty()
  @IsUUID()
  ownerId!: string;
}
