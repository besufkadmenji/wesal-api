import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintService } from './complaint.service';
import { ComplaintResolver } from './complaint.resolver';
import { Complaint } from './entities/complaint.entity';
import { User } from '../user/entities/user.entity';
import { Advertisement } from '../advertisement/entities/advertisement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Complaint, User, Advertisement])],
  providers: [ComplaintResolver, ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintModule {}
