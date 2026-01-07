import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';
import { AdminStatus } from './enums/admin-status.enum';
import { CreateAdminInput } from './dto/create-admin.input';
import { UpdateAdminInput } from './dto/update-admin.input';
import { AdminPaginationInput } from './dto/admin-pagination.input';
import { AdminPermissionType } from './enums/admin-permission-type.enum';
import { I18nBadRequestException, I18nNotFoundException } from 'lib/errors';
import { I18nService } from 'lib/i18n/i18n.service';
import type { LanguageCode } from 'lib/i18n/language.types';
import { ADMIN_ERROR_MESSAGES } from './errors/admin.error-messages';
import { SortOrder } from 'lib/common/dto/pagination.input';
import { IPaginatedType } from 'lib/common/dto/paginated-response';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async create(
    createAdminInput: CreateAdminInput,
    language: LanguageCode = 'en',
  ): Promise<Admin> {
    // Check if email already exists
    const existingAdmin = await this.adminRepository.findOne({
      where: { email: createAdminInput.email },
    });

    if (existingAdmin) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['EMAIL_ALREADY_IN_USE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createAdminInput.password, 10);

    // Create admin
    const admin = this.adminRepository.create({
      ...createAdminInput,
      password: hashedPassword,
    });

    return this.adminRepository.save(admin);
  }

  async findAll(
    paginationInput?: AdminPaginationInput,
  ): Promise<IPaginatedType<Admin>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      permissionType,
      sortBy,
      sortOrder = SortOrder.ASC,
    } = paginationInput || {};

    const skip = (page - 1) * limit;
    const orderByField = sortBy || 'createdAt';
    const orderDirection = sortOrder === SortOrder.DESC ? 'DESC' : 'ASC';

    const queryBuilder = this.adminRepository
      .createQueryBuilder('admin')
      .select('admin');

    if (search) {
      queryBuilder.andWhere(
        '(admin.email ILIKE :search OR admin.fullName ILIKE :search OR admin.organizationName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('admin.status = :status', { status });
    }

    if (permissionType) {
      queryBuilder.andWhere('admin.permissionType = :permissionType', {
        permissionType,
      });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(`admin.${orderByField}`, orderDirection)
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

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Admin> {
    const admin = await this.adminRepository.findOne({
      where: { id },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return admin;
  }

  async update(
    id: string,
    updateAdminInput: UpdateAdminInput,
    language: LanguageCode = 'en',
  ): Promise<Admin> {
    const admin = await this.findOne(id, language);

    // Check if new email is already in use by another admin
    if (updateAdminInput.email && updateAdminInput.email !== admin.email) {
      const existingAdmin = await this.adminRepository.findOne({
        where: { email: updateAdminInput.email },
      });

      if (existingAdmin) {
        const message = I18nService.translate(
          ADMIN_ERROR_MESSAGES['EMAIL_ALREADY_IN_USE'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    // Hash password if provided
    if (updateAdminInput.password) {
      updateAdminInput.password = await bcrypt.hash(
        updateAdminInput.password,
        10,
      );
    }

    // Update admin
    Object.assign(admin, updateAdminInput);
    return this.adminRepository.save(admin);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<boolean> {
    const admin = await this.findOne(id, language);

    // Prevent deletion of last administrator
    if (admin.permissionType === AdminPermissionType.ADMINISTRATOR) {
      const administratorCount = await this.adminRepository.count({
        where: { permissionType: AdminPermissionType.ADMINISTRATOR },
      });

      if (administratorCount === 1) {
        const message = I18nService.translate(
          ADMIN_ERROR_MESSAGES['CANNOT_DELETE_LAST_ADMINISTRATOR'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    await this.adminRepository.remove(admin);
    return true;
  }

  async activate(id: string, language: LanguageCode = 'en'): Promise<Admin> {
    const admin = await this.findOne(id, language);

    // Check if already active
    if (admin.status === AdminStatus.ACTIVE) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['ADMIN_ALREADY_ACTIVE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    admin.status = AdminStatus.ACTIVE;
    return this.adminRepository.save(admin);
  }

  async deactivate(id: string, language: LanguageCode = 'en'): Promise<Admin> {
    const admin = await this.findOne(id, language);

    // Check if already inactive
    if (admin.status === AdminStatus.INACTIVE) {
      const message = I18nService.translate(
        ADMIN_ERROR_MESSAGES['ADMIN_ALREADY_INACTIVE'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    // Prevent deactivation of last active administrator
    if (admin.permissionType === AdminPermissionType.ADMINISTRATOR) {
      const activeAdministratorCount = await this.adminRepository.count({
        where: {
          permissionType: AdminPermissionType.ADMINISTRATOR,
          status: AdminStatus.ACTIVE,
        },
      });

      if (activeAdministratorCount === 1) {
        const message = I18nService.translate(
          ADMIN_ERROR_MESSAGES['CANNOT_DEACTIVATE_LAST_ADMINISTRATOR'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    admin.status = AdminStatus.INACTIVE;
    return this.adminRepository.save(admin);
  }
}
