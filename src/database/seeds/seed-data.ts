import { DataSource } from 'typeorm';
import { Country } from '../../country/entities/country.entity';
import { City } from '../../city/entities/city.entity';
import { Category } from '../../category/entities/category.entity';

export const seedDatabase = async (dataSource: DataSource) => {
  // Get repositories
  const countryRepository = dataSource.getRepository(Country);
  const cityRepository = dataSource.getRepository(City);
  const categoryRepository = dataSource.getRepository(Category);

  // Seed Countries
  const saudiarabia = await countryRepository.findOne({
    where: { code: 'SA' },
  });

  let ksa: Country;
  if (!saudiarabia) {
    ksa = countryRepository.create({
      name: 'Saudi Arabia',
      code: 'SA',
    });
    await countryRepository.save(ksa);
    console.log('✓ Saudi Arabia created');
  } else {
    ksa = saudiarabia;
    console.log('✓ Saudi Arabia already exists');
  }

  // Seed Cities for Saudi Arabia
  const citiesData = [
    {
      name: 'Riyadh',
      countryId: ksa.id,
    },
    {
      name: 'Jeddah',
      countryId: ksa.id,
    },
    {
      name: 'Dammam',
      countryId: ksa.id,
    },
    {
      name: 'Mecca',
      countryId: ksa.id,
    },
    {
      name: 'Medina',
      countryId: ksa.id,
    },
    {
      name: 'Abha',
      countryId: ksa.id,
    },
    {
      name: 'Taif',
      countryId: ksa.id,
    },
    {
      name: 'Khobar',
      countryId: ksa.id,
    },
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

  console.log('\n✅ Database seeding completed!');
};
