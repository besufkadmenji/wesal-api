import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Country } from './src/country/entities/country.entity';
import { City } from './src/city/entities/city.entity';
import { Category } from './src/category/entities/category.entity';

// Load env from .env file manually
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && !process.env[key]) {
      process.env[key] = value?.trim();
    }
  });
}

// Create a temporary DataSource for seeding
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Country, City, Category],
  synchronize: false,
  logging: false,
});

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...\n');
    await AppDataSource.initialize();

    // Get repositories
    const countryRepository = AppDataSource.getRepository(Country);
    const cityRepository = AppDataSource.getRepository(City);
    const categoryRepository = AppDataSource.getRepository(Category);

    // Seed Countries
    const saudiarabia = await countryRepository.findOne({
      where: { code: 'SA' },
    });

    let ksa: Country;
    if (!saudiarabia) {
      ksa = countryRepository.create({
        name: 'Saudi Arabia',
        code: 'SA',
        dialCode: '+966',
      });
      await countryRepository.save(ksa);
      console.log('✓ Saudi Arabia created');
    } else {
      ksa = saudiarabia;
      console.log('✓ Saudi Arabia already exists');
    }

    // Seed Cities for Saudi Arabia
    const citiesData = [
      { name: 'Riyadh', countryId: ksa.id },
      { name: 'Jeddah', countryId: ksa.id },
      { name: 'Dammam', countryId: ksa.id },
      { name: 'Mecca', countryId: ksa.id },
      { name: 'Medina', countryId: ksa.id },
      { name: 'Abha', countryId: ksa.id },
      { name: 'Taif', countryId: ksa.id },
      { name: 'Khobar', countryId: ksa.id },
    ];

    for (const cityData of citiesData) {
      const existingCity = await cityRepository.findOne({
        where: { name: cityData.name, countryId: cityData.countryId },
      });

      if (!existingCity) {
        const city = cityRepository.create(cityData);
        await cityRepository.save(city);
        console.log(`✓ City "${cityData.name}" created`);
      } else {
        console.log(`✓ City "${cityData.name}" already exists`);
      }
    }

    // Seed Categories
    const categoriesData = [
      {
        nameEn: 'Plumbing',
        nameAr: 'السباكة',
        descriptionEn: 'Plumbing services and repairs',
        descriptionAr: 'خدمات السباكة والإصلاحات',
      },
      {
        nameEn: 'Electrical',
        nameAr: 'الكهرباء',
        descriptionEn: 'Electrical installation and maintenance',
        descriptionAr: 'التركيب والصيانة الكهربائية',
      },
      {
        nameEn: 'Cleaning',
        nameAr: 'التنظيف',
        descriptionEn: 'Cleaning services',
        descriptionAr: 'خدمات التنظيف',
      },
      {
        nameEn: 'Carpentry',
        nameAr: 'النجارة',
        descriptionEn: 'Carpentry and woodwork services',
        descriptionAr: 'خدمات النجارة والعمل بالخشب',
      },
      {
        nameEn: 'Painting',
        nameAr: 'الرسم',
        descriptionEn: 'Interior and exterior painting',
        descriptionAr: 'الطلاء الداخلي والخارجي',
      },
      {
        nameEn: 'HVAC',
        nameAr: 'التدفئة والتكييف',
        descriptionEn: 'Heating and cooling system services',
        descriptionAr: 'خدمات أنظمة التدفئة والتبريد',
      },
      {
        nameEn: 'Landscaping',
        nameAr: 'تنسيق الحدائق',
        descriptionEn: 'Landscape design and maintenance',
        descriptionAr: 'تصميم ورعاية الحدائق',
      },
      {
        nameEn: 'Pest Control',
        nameAr: 'مكافحة الآفات',
        descriptionEn: 'Pest control and prevention services',
        descriptionAr: 'خدمات مكافحة والوقاية من الآفات',
      },
      {
        nameEn: 'Glass & Glazing',
        nameAr: 'الزجاج والتزجيج',
        descriptionEn: 'Glass installation and repair',
        descriptionAr: 'تركيب وإصلاح الزجاج',
      },
      {
        nameEn: 'Appliance Repair',
        nameAr: 'إصلاح الأجهزة',
        descriptionEn: 'Home appliance repair and maintenance',
        descriptionAr: 'إصلاح وصيانة الأجهزة المنزلية',
      },
    ];

    for (const categoryData of categoriesData) {
      const existingCategory = await categoryRepository.findOne({
        where: { nameEn: categoryData.nameEn },
      });

      if (!existingCategory) {
        const category = categoryRepository.create(categoryData);
        await categoryRepository.save(category);
        console.log(`✓ Category "${categoryData.nameEn}" created`);
      } else {
        console.log(`✓ Category "${categoryData.nameEn}" already exists`);
      }
    }

    await AppDataSource.destroy();
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

runSeeds();
