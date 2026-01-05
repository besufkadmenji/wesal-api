import { Repository } from 'typeorm';
import { Country } from '../../country/entities/country.entity';
import { City } from '../../city/entities/city.entity';
import { Category } from '../../category/entities/category.entity';

export const seedCountries = async (
  countryRepository: Repository<Country>,
): Promise<Country> => {
  const saudiarabia = await countryRepository.findOne({
    where: { code: 'SA' },
  });

  let ksa: Country;
  if (!saudiarabia) {
    ksa = countryRepository.create({
      nameEn: 'Saudi Arabia',
      code: 'SA',
      nameAr: 'المملكة العربية السعودية',
    });
    await countryRepository.save(ksa);
    console.log('✓ Saudi Arabia created');
  } else {
    ksa = saudiarabia;
    console.log('✓ Saudi Arabia already exists');
  }

  return ksa;
};

export const seedCities = async (
  cityRepository: Repository<City>,
  countryRepository: Repository<Country>,
): Promise<void> => {
  const country = await countryRepository.findOne({
    where: { code: 'SA' },
  });

  if (!country) {
    console.log('⚠ Country not found, skipping cities seeding');
    return;
  }

  // Seed Cities for Saudi Arabia
  const citiesData = [
    { nameEn: 'Riyadh', nameAr: 'الرياض', countryId: country.id },
    { nameEn: 'Jeddah', nameAr: 'جدة', countryId: country.id },
    { nameEn: 'Dammam', nameAr: 'الدمام', countryId: country.id },
    { nameEn: 'Mecca', nameAr: 'مكة', countryId: country.id },
    { nameEn: 'Medina', nameAr: 'المدينة', countryId: country.id },
    { nameEn: 'Abha', nameAr: 'أبها', countryId: country.id },
    { nameEn: 'Taif', nameAr: 'الطائف', countryId: country.id },
    { nameEn: 'Khobar', nameAr: 'الخبر', countryId: country.id },
  ];

  for (const cityData of citiesData) {
    const existingCity = await cityRepository.findOne({
      where: { nameEn: cityData.nameEn, countryId: cityData.countryId },
    });

    if (!existingCity) {
      const city = cityRepository.create(cityData);
      await cityRepository.save(city);
      console.log(`✓ City "${cityData.nameEn}" created`);
    } else {
      console.log(`✓ City "${cityData.nameEn}" already exists`);
    }
  }
};

export const seedCategories = async (
  categoryRepository: Repository<Category>,
): Promise<void> => {
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
      descriptionAr: 'خدمات النجارة والأعمال الخشبية',
    },
    {
      nameEn: 'Painting',
      nameAr: 'الدهان',
      descriptionEn: 'Interior and exterior painting',
      descriptionAr: 'الدهان الداخلي والخارجي',
    },
    {
      nameEn: 'HVAC',
      nameAr: 'تكييف الهواء',
      descriptionEn: 'Air conditioning and heating services',
      descriptionAr: 'خدمات التكييف والتدفئة',
    },
    {
      nameEn: 'Landscaping',
      nameAr: 'تنسيق الحدائق',
      descriptionEn: 'Garden and landscape design',
      descriptionAr: 'تصميم الحدائق والمناظر الطبيعية',
    },
    {
      nameEn: 'Pest Control',
      nameAr: 'مكافحة الآفات',
      descriptionEn: 'Pest control and fumigation',
      descriptionAr: 'مكافحة الآفات والتعقيم',
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
      descriptionEn: 'Home appliance repair services',
      descriptionAr: 'خدمات إصلاح الأجهزة المنزلية',
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
};
