import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Permission } from '../entities/permission.entity';

export async function seedPermissions(dataSource: DataSource): Promise<void> {
  const permissionRepository = dataSource.getRepository(Permission);

  try {
    // Read seed.json
    const seedPath = path.join(__dirname, '..', 'seed.json');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    const permissions = seedData.data?.permissions || [];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const permissionData of permissions) {
      // Upsert by (module, action, resource) unique constraint
      const existing = await permissionRepository.findOne({
        where: {
          module: permissionData.module,
          action: permissionData.action,
          resource: permissionData.resource,
        },
      });

      if (existing) {
        // Update if different
        const needsUpdate =
          existing.name !== permissionData.name ||
          existing.nameAr !== permissionData.nameAr ||
          existing.description !== permissionData.description ||
          existing.permissionPlatform !== permissionData.permissionPlatform;

        if (needsUpdate) {
          Object.assign(existing, {
            name: permissionData.name,
            nameAr: permissionData.nameAr,
            description: permissionData.description,
            permissionPlatform: permissionData.permissionPlatform,
          });
          await permissionRepository.save(existing);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new
        const permission = permissionRepository.create(permissionData);
        await permissionRepository.save(permission);
        created++;
      }
    }

    console.log(
      `✓ Permissions seeded: ${created} created, ${updated} updated, ${skipped} skipped`,
    );
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}
