import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../lib/common/dto/paginated-response';
import { Payment } from '../entities/payment.entity';

@ObjectType()
export class PaginatedPaymentResponse extends Paginated(Payment) {}
