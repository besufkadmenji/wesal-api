import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SettingService } from './setting.service';
import { Setting } from './entities/setting.entity';
import { SettingInput } from './dto/setting.input';

@Resolver(() => Setting)
export class SettingResolver {
  constructor(private readonly settingService: SettingService) {}

  @Query(() => Setting, {
    description: 'Get application settings',
  })
  getSetting() {
    return this.settingService.getSetting();
  }

  @Mutation(() => Setting, {
    description: 'Create or update application settings',
  })
  setSetting(@Args('input') input: SettingInput) {
    return this.settingService.setSetting(input);
  }
}
