import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Contract numbers freed by pre-payment deletions, reused smallest first. */
@Entity('contract_number_pool')
export class ContractNumberPool {
  @PrimaryColumn({ type: 'bigint' })
  number: string;

  @CreateDateColumn({ type: 'timestamptz' })
  releasedAt: Date;
}
