import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';
import { CreateAdminInput } from './dto/create-admin.input';
import { UpdateAdminInput } from './dto/update-admin.input';
import { AdminPermissionType } from './enums/admin-permission-type.enum';
import { I18nBadRequestException, I18nNotFoundException } from 'lib/errors';
import { I18nService } from 'lib/i18n/i18n.service';
import type { LanguageCode } from 'lib/i18n/language.types';
import { ADMIN_ERROR_MESSAGES } from './errors/admin.error-messages';

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

  async findAll(): Promise<Admin[]> {
    return this.adminRepository.find({
      order: { createdAt: 'DESC' },
    });
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
}
