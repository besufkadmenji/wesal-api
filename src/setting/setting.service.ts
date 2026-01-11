import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingInput } from './dto/setting.input';
import { Setting } from './entities/setting.entity';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000000'; // Hardcoded ID for the single row

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

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

    // Convert null/undefined to empty string for text fields and empty array for array fields
    const cleanedInput: SettingInput = {
      aboutEn: input.aboutEn ?? '',
      aboutAr: input.aboutAr ?? '',
      privacyPolicyEn: input.privacyPolicyEn ?? '',
      privacyPolicyAr: input.privacyPolicyAr ?? '',
      termsEn: input.termsEn ?? '',
      termsAr: input.termsAr ?? '',
      phones: input.phones ?? [],
      email: input.email ?? '',
      whatsappNumber: input.whatsappNumber ?? '',
      socialMediaLinks: input.socialMediaLinks ?? [],
    };

    if (setting) {
      // Update existing settings
      await this.settingRepository.save({
        ...setting,
        ...cleanedInput,
      });
      return await this.getSetting();
    }

    // Create new settings with hardcoded ID
    setting = this.settingRepository.create({
      id: SETTINGS_ID,
      ...cleanedInput,
    });
    await this.settingRepository.save(setting);
    return await this.getSetting();
  }
}
