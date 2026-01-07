import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { AdminPermissionType } from '../enums/admin-permission-type.enum';
import { AdminStatus } from '../enums/admin-status.enum';
import { AdminUserType } from '../enums/admin-user-type.enum';

export async function seedAdmins(dataSource: DataSource): Promise<void> {
  const adminRepository = dataSource.getRepository(Admin);

  try {
    // Check if any admin exists
    const adminCount = await adminRepository.count();

    if (adminCount === 0) {
      // Hash password
      const hashedPassword = await bcrypt.hash('Qwertyuiop1@', 10);

      // Create super admin
      const superAdmin = adminRepository.create({
        email: 'superadmin@wesal.com',
        fullName: 'Super Administrator',
        organizationName: 'Wesal Platform',
        roleName: 'Super Admin',
        password: hashedPassword,
        permissionType: AdminPermissionType.SUPER_ADMIN,
        userType: AdminUserType.PLATFORM,
        status: AdminStatus.ACTIVE,
      });

      await adminRepository.save(superAdmin);
      console.log('✓ Seeded super admin: superadmin@wesal.com');
    } else {
      console.log(
        `✓ Admins already exist (${adminCount} found), skipping admin seed`,
      );
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    throw error;
  }
}
