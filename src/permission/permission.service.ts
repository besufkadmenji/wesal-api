import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionInput } from './dto/create-permission.input';
import { UpdatePermissionInput } from './dto/update-permission.input';
import { I18nBadRequestException, I18nNotFoundException } from 'lib/errors';
import { I18nService } from 'lib/i18n/i18n.service';
import type { LanguageCode } from 'lib/i18n/language.types';
import { PERMISSION_ERROR_MESSAGES } from './errors/permission.error-messages';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(
    createPermissionInput: CreatePermissionInput,
    language: LanguageCode = 'en',
  ): Promise<Permission> {
    // Check if permission already exists with same module/action/resource
    const existing = await this.permissionRepository.findOne({
      where: {
        module: createPermissionInput.module,
        action: createPermissionInput.action,
        resource: createPermissionInput.resource,
      },
    });

    if (existing) {
      const message = I18nService.translate(
        PERMISSION_ERROR_MESSAGES['PERMISSION_ALREADY_EXISTS'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const permission = this.permissionRepository.create(createPermissionInput);
    return this.permissionRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { module: 'ASC', action: 'ASC' },
    });
  }

  async findOne(id: string, language: LanguageCode = 'en'): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      const message = I18nService.translate(
        PERMISSION_ERROR_MESSAGES['PERMISSION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    return permission;
  }

  async update(
    id: string,
    updatePermissionInput: UpdatePermissionInput,
    language: LanguageCode = 'en',
  ): Promise<Permission> {
    const permission = await this.findOne(id, language);

    // Check if updating to existing module/action/resource combination
    if (
      updatePermissionInput.module ||
      updatePermissionInput.action ||
      updatePermissionInput.resource
    ) {
      const existing = await this.permissionRepository.findOne({
        where: {
          module: updatePermissionInput.module || permission.module,
          action: updatePermissionInput.action || permission.action,
          resource: updatePermissionInput.resource || permission.resource,
        },
      });

      if (existing && existing.id !== id) {
        const message = I18nService.translate(
          PERMISSION_ERROR_MESSAGES['PERMISSION_ALREADY_EXISTS'],
          language,
        );
        throw new I18nBadRequestException(
          { en: message, ar: message },
          language,
        );
      }
    }

    Object.assign(permission, updatePermissionInput);
    return this.permissionRepository.save(permission);
  }

  async remove(id: string, language: LanguageCode = 'en'): Promise<boolean> {
    const permission = await this.findOne(id, language);
    await this.permissionRepository.remove(permission);
    return true;
  }
}
