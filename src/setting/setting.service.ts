import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingInput } from './dto/setting.input';
import { Setting } from './entities/setting.entity';
import { Admin } from '../admin/entities/admin.entity';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000000'; // Hardcoded ID for the single row

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  /**
   * Get all settings
   */
  async findAll(): Promise<Setting[]> {
    const setting = await this.getSetting();
    return [setting]; // Return as array for consistency with export
  }

  async getSetting(): Promise<Setting> {
    let setting = await this.settingRepository.findOne({
      where: { id: SETTINGS_ID },
    });

    if (!setting) {
      // Auto-create if doesn't exist
      setting = this.settingRepository.create({
        id: SETTINGS_ID,
      });
      return this.settingRepository.save(setting);
    }

    return setting;
  }

  async setSetting(input: SettingInput): Promise<Setting> {
    let setting = await this.settingRepository.findOne({
      where: { id: SETTINGS_ID },
    });

    const current =
      setting ?? this.settingRepository.create({ id: SETTINGS_ID });
    const next = { ...current, ...input };
    if (
      next.premiumAdEnabled &&
      (Number(next.premiumAdFee) <= 0 || next.premiumAdDurationDays < 1)
    ) {
      throw new BadRequestException(
        'Enabled premium ads require a positive fee and duration',
      );
    }
    if (
      next.contractAcceptanceWindowEnabled &&
      next.contractAcceptanceWindowDays < 1
    ) {
      throw new BadRequestException(
        'Enabled contract acceptance window requires at least one day',
      );
    }

    if (setting) {
      // Update existing settings
      Object.assign(setting, input);
      await this.settingRepository.save(setting);
      return await this.getSetting();
    }

    // Create new settings with hardcoded ID
    const cleanInput = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== null),
    );
    setting = this.settingRepository.create({
      id: SETTINGS_ID,
      ...cleanInput,
    });
    await this.settingRepository.save(setting);
    return await this.getSetting();
  }
}
