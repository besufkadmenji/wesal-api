import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  I18nNotFoundException,
  I18nBadRequestException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import { SortOrder } from '../../lib/common/dto/pagination.input';
import { CreatePaymentInput } from './dto/create-payment.input';
import { UpdatePaymentInput } from './dto/update-payment.input';
import { PaymentPaginationInput } from './dto/payment-pagination.input';
import { Payment } from './entities/payment.entity';
import { Contract } from '../contract/entities/contract.entity';
import { User } from '../user/entities/user.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { PAYMENT_ERROR_MESSAGES } from './errors/payment.error-messages';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createPaymentInput: CreatePaymentInput,
    language: LanguageCode = 'en',
  ): Promise<Payment> {
    // Validate contract exists
    const contract = await this.contractRepository.findOne({
      where: { id: createPaymentInput.contractId },
    });
    if (!contract) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['CONTRACT_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createPaymentInput.userId },
    });
    if (!user) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['USER_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Validate amount
    if (createPaymentInput.amount <= 0) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['INVALID_AMOUNT'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Create payment with fake gateway response
    const transactionRef =
      createPaymentInput.transactionReference ||
      `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payment = this.paymentRepository.create({
      ...createPaymentInput,
      transactionReference: transactionRef,
      gatewayResponse: JSON.stringify({
        success: true,
        message: 'Payment processed successfully (simulated)',
        timestamp: new Date().toISOString(),
        gateway: 'fake-gateway',
      }),
    });

    return await this.paymentRepository.save(payment);
  }

  async findAll(
    paginationInput: PaymentPaginationInput,
  ): Promise<IPaginatedType<Payment>> {
    const {
      page = 1,
      limit = 10,
      contractId,
      userId,
      status,
      paymentMethod,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput;
    const skip = (page - 1) * limit;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.contract', 'contract')
      .leftJoinAndSelect('payment.user', 'user');

    if (contractId) {
      queryBuilder.andWhere('payment.contractId = :contractId', {
        contractId,
      });
    }

    if (userId) {
      queryBuilder.andWhere('payment.userId = :userId', { userId });
    }

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (paymentMethod) {
      queryBuilder.andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod,
      });
    }

    const orderByField = sortBy ? `payment.${sortBy}` : 'payment.createdAt';
    const orderDirection = sortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(orderByField, orderDirection)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['contract', 'user'],
    });

    if (!payment) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['PAYMENT_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return payment;
  }

  async update(
    updatePaymentInput: UpdatePaymentInput,
    language: LanguageCode = 'en',
  ): Promise<Payment> {
    const payment = await this.findOne(updatePaymentInput.id, language);

    // Prevent updates to completed or refunded payments
    if (payment.status === PaymentStatus.COMPLETED) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['PAYMENT_ALREADY_COMPLETED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['PAYMENT_ALREADY_REFUNDED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Validate amount if being updated
    if (
      updatePaymentInput.amount !== undefined &&
      updatePaymentInput.amount <= 0
    ) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['INVALID_AMOUNT'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    Object.assign(payment, updatePaymentInput);
    return await this.paymentRepository.save(payment);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<Payment> {
    const payment = await this.findOne(id, language);
    await this.paymentRepository.remove(payment);
    return payment;
  }

  async processRefund(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<Payment> {
    const payment = await this.findOne(id, language);

    if (payment.status === PaymentStatus.REFUNDED) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['PAYMENT_ALREADY_REFUNDED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      const message = I18nService.translate(
        PAYMENT_ERROR_MESSAGES['INVALID_STATUS_TRANSITION'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.gatewayResponse = JSON.stringify({
      success: true,
      message: 'Refund processed successfully (simulated)',
      timestamp: new Date().toISOString(),
      gateway: 'fake-gateway',
      originalTransaction: payment.transactionReference,
    });

    return await this.paymentRepository.save(payment);
  }
}
