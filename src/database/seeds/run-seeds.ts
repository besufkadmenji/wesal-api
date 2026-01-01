import { DataSource } from 'typeorm';
import { Country } from '../../country/entities/country.entity';
import { City } from '../../city/entities/city.entity';
import { Category } from '../../category/entities/category.entity';
import { seedCountries, seedCities, seedCategories } from './seed-data';

export async function runDatabaseSeeds(dataSource: DataSource): Promise<void> {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Get repositories
    const countryRepository = dataSource.getRepository(Country);
    const cityRepository = dataSource.getRepository(City);
    const categoryRepository = dataSource.getRepository(Category);

    // Run seed functions
    await seedCountries(countryRepository);
    await seedCities(cityRepository, countryRepository);
    await seedCategories(categoryRepository);

    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}
