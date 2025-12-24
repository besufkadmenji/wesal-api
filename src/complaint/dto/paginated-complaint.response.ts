import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Complaint } from '../entities/complaint.entity';

@ObjectType()
export class PaginatedComplaintResponse extends Paginated(Complaint) {}
