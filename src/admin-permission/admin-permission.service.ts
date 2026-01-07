import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AdminPermission } from './entities/admin-permission.entity';
import { AssignPermissionInput } from './dto/assign-permission.input';
import { Admin } from '../admin/entities/admin.entity';
import { Permission } from '../permission/entities/permission.entity';
import { I18nBadRequestException, I18nNotFoundException } from 'lib/errors';
import { I18nService } from 'lib/i18n/i18n.service';
import type { LanguageCode } from 'lib/i18n/language.types';
import { ADMIN_PERMISSION_ERROR_MESSAGES } from './errors/admin-permission.error-messages';

@Injectable()
export class AdminPermissionService {
  constructor(
    @InjectRepository(AdminPermission)
    private readonly adminPermissionRepository: Repository<AdminPermission>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async assign(
    assignPermissionInput: AssignPermissionInput,
    language: LanguageCode = 'en',
  ): Promise<AdminPermission> {
    // Check if admin exists
    const admin = await this.adminRepository.findOne({
      where: { id: assignPermissionInput.adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_PERMISSION_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if permission exists
    const permission = await this.permissionRepository.findOne({
      where: { id: assignPermissionInput.permissionId },
    });

    if (!permission) {
      const message = I18nService.translate(
        ADMIN_PERMISSION_ERROR_MESSAGES['PERMISSION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if permission is already assigned
    const existingAssignment = await this.adminPermissionRepository.findOne({
      where: {
        adminId: assignPermissionInput.adminId,
        permissionId: assignPermissionInput.permissionId,
      },
    });

    if (existingAssignment) {
      const message = I18nService.translate(
        ADMIN_PERMISSION_ERROR_MESSAGES['PERMISSION_ALREADY_ASSIGNED'],
        language,
      );
      throw new I18nBadRequestException({ en: message, ar: message }, language);
    }

    const adminPermission = this.adminPermissionRepository.create(
      assignPermissionInput,
    );
    return this.adminPermissionRepository.save(adminPermission);
  }

  async findAdminPermissions(adminId: string): Promise<AdminPermission[]> {
    return this.adminPermissionRepository.find({
      where: { adminId },
      relations: ['permission'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPermissionAdmins(permissionId: string): Promise<AdminPermission[]> {
    return this.adminPermissionRepository.find({
      where: { permissionId },
      relations: ['admin'],
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(
    adminId: string,
    permissionId: string,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    const adminPermission = await this.adminPermissionRepository.findOne({
      where: { adminId, permissionId },
    });

    if (!adminPermission) {
      const message = I18nService.translate(
        ADMIN_PERMISSION_ERROR_MESSAGES['ADMIN_PERMISSION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    await this.adminPermissionRepository.remove(adminPermission);
    return true;
  }

  async revokeAll(
    adminId: string,
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_PERMISSION_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    await this.adminPermissionRepository.delete({ adminId });
    return true;
  }

  async bulkAssign(
    adminId: string,
    permissionIds: string[],
    language: LanguageCode = 'en',
  ): Promise<AdminPermission[]> {
    // Check if admin exists
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_PERMISSION_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Check if all permissions exist
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });
    if (permissions.length !== permissionIds.length) {
      const message = I18nService.translate(
        ADMIN_PERMISSION_ERROR_MESSAGES['PERMISSION_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Get existing assignments
    const existing = await this.adminPermissionRepository.find({
      where: { adminId, permissionId: In(permissionIds) },
    });
    const existingPermissionIds = existing.map((ap) => ap.permissionId);

    // Create new assignments for non-existing ones
    const newAssignments = permissionIds
      .filter((pId) => !existingPermissionIds.includes(pId))
      .map((permissionId) =>
        this.adminPermissionRepository.create({ adminId, permissionId }),
      );

    if (newAssignments.length > 0) {
      await this.adminPermissionRepository.save(newAssignments);
    }

    // Return all permissions for this admin
    return this.adminPermissionRepository.find({
      where: { adminId },
      relations: ['permission'],
    });
  }

  async bulkRevoke(
    adminId: string,
    permissionIds: string[],
    language: LanguageCode = 'en',
  ): Promise<boolean> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      const message = I18nService.translate(
        ADMIN_PERMISSION_ERROR_MESSAGES['ADMIN_NOT_FOUND'],
        language,
      );
      throw new I18nNotFoundException({ en: message, ar: message }, language);
    }

    // Delete matching assignments
    await this.adminPermissionRepository.delete({
      adminId,
      permissionId: In(permissionIds),
    });

    return true;
  }
}
