import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IPaginatedType } from '../../lib/common/dto/paginated-response';
import {
  I18nBadRequestException,
  I18nNotFoundException,
} from '../../lib/errors';
import { I18nService } from '../../lib/i18n/i18n.service';
import type { LanguageCode } from '../../lib/i18n/language.types';
import { CreateDeliveryCompanyInput } from './dto/create-delivery-company.input';
import { DeliveryCompanyPaginationInput } from './dto/delivery-company-pagination.input';
import { UpdateDeliveryCompanyInput } from './dto/update-delivery-company.input';
import { DeliveryCompany } from './entities/delivery-company.entity';
import { DeliveryCompanyStatus } from './enums/delivery-company-status.enum';
import { DELIVERY_COMPANY_ERROR_MESSAGES } from './errors/delivery-company.error-messages';

@Injectable()
export class DeliveryCompanyService {
  constructor(
    @InjectRepository(DeliveryCompany)
    private readonly deliveryCompanyRepository: Repository<DeliveryCompany>,
  ) {}

  async create(
    createDeliveryCompanyInput: CreateDeliveryCompanyInput,
    language: LanguageCode = 'en',
  ): Promise<DeliveryCompany> {
    // Check if delivery company with the same name already exists
    const existingDeliveryCompany =
      await this.deliveryCompanyRepository.findOne({
        where: [
          { nameEn: createDeliveryCompanyInput.nameEn },
          { nameAr: createDeliveryCompanyInput.nameAr },
        ],
      });

    if (existingDeliveryCompany) {
      const message = I18nService.translate(
        DELIVERY_COMPANY_ERROR_MESSAGES['DELIVERY_COMPANY_NAME_ALREADY_EXISTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const deliveryCompany = this.deliveryCompanyRepository.create(
      createDeliveryCompanyInput,
    );
    return await this.deliveryCompanyRepository.save(deliveryCompany);
  }

  async findAll(
    paginationInput?: DeliveryCompanyPaginationInput,
  ): Promise<IPaginatedType<DeliveryCompany>> {
    const { page = 1, limit = 10, search, status } = paginationInput || {};
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.deliveryCompanyRepository.createQueryBuilder('deliveryCompany');

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(deliveryCompany.nameEn ILIKE :search OR deliveryCompany.nameAr ILIKE :search)',
        { search: searchTerm },
      );
    }

    // Add status filter if provided
    if (status) {
      queryBuilder.andWhere('deliveryCompany.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('deliveryCompany.createdAt', 'DESC')
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

  async findOne(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<DeliveryCompany> {
    const deliveryCompany = await this.deliveryCompanyRepository.findOne({
      where: { id },
    });

    if (!deliveryCompany) {
      const message = I18nService.translate(
        DELIVERY_COMPANY_ERROR_MESSAGES['DELIVERY_COMPANY_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return deliveryCompany;
  }

  async update(
    updateDeliveryCompanyInput: UpdateDeliveryCompanyInput,
    language: LanguageCode = 'en',
  ): Promise<DeliveryCompany> {
    const deliveryCompany = await this.findOne(
      updateDeliveryCompanyInput.id,
      language,
    );

    // Check if new name is already in use by another delivery company
    if (
      updateDeliveryCompanyInput.nameEn ||
      updateDeliveryCompanyInput.nameAr
    ) {
      const existingDeliveryCompany = await this.deliveryCompanyRepository
        .createQueryBuilder('deliveryCompany')
        .where('deliveryCompany.id != :id', {
          id: updateDeliveryCompanyInput.id,
        })
        .andWhere(
          '(deliveryCompany.nameEn = :nameEn OR deliveryCompany.nameAr = :nameAr)',
          {
            nameEn: updateDeliveryCompanyInput.nameEn || deliveryCompany.nameEn,
            nameAr: updateDeliveryCompanyInput.nameAr || deliveryCompany.nameAr,
          },
        )
        .getOne();

      if (existingDeliveryCompany) {
        const message = I18nService.translate(
          DELIVERY_COMPANY_ERROR_MESSAGES[
            'DELIVERY_COMPANY_NAME_ALREADY_EXISTS'
          ],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    Object.assign(deliveryCompany, updateDeliveryCompanyInput);
    return await this.deliveryCompanyRepository.save(deliveryCompany);
  }

  async remove(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<DeliveryCompany> {
    const deliveryCompany = await this.findOne(id, language);
    await this.deliveryCompanyRepository.delete({ id });
    return deliveryCompany;
  }

  async activate(
    id: string,
    language: LanguageCode = 'en',
  ): Promise<DeliveryCompany> {
    const deliveryCompany = await this.findOne(id, language);

    // Check if already active
    if (deliveryCompany.status === DeliveryCompanyStatus.ACTIVE) {
      const message = I18nService.translate(
        DELIVERY_COMPANY_ERROR_MESSAGES['DELIVERY_COMPANY_ALREADY_ACTIVE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    deliveryCompany.status = DeliveryCompanyStatus.ACTIVE;
    return await this.deliveryCompanyRepository.save(deliveryCompany);
  }

  async deactivate(
    id: string,
    reason: string,
    language: LanguageCode = 'en',
  ): Promise<DeliveryCompany> {
    const deliveryCompany = await this.findOne(id, language);

    // Check if already inactive
    if (deliveryCompany.status === DeliveryCompanyStatus.INACTIVE) {
      const message = I18nService.translate(
        DELIVERY_COMPANY_ERROR_MESSAGES['DELIVERY_COMPANY_ALREADY_INACTIVE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    deliveryCompany.status = DeliveryCompanyStatus.INACTIVE;
    deliveryCompany.deactivationReason = reason;
    return await this.deliveryCompanyRepository.save(deliveryCompany);
  }
}
