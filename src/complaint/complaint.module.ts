import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintService } from './complaint.service';
import { ComplaintResolver } from './complaint.resolver';
import { ComplaintController } from './complaint.controller';
import { Complaint } from './entities/complaint.entity';
import { User } from '../user/entities/user.entity';
import { Listing } from '../listing/entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Complaint, User, Listing])],
  controllers: [ComplaintController],
  providers: [ComplaintResolver, ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintModule {}
