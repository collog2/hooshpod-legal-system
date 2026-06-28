import { Global, Module } from '@nestjs/common';
import { OwnershipService, PolymorphicEntityService } from './services/access.service';

@Global()
@Module({
  providers: [OwnershipService, PolymorphicEntityService],
  exports: [OwnershipService, PolymorphicEntityService],
})
export class AccessModule {}
