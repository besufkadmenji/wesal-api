import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ElasticsearchService } from '../../lib/elasticsearch/elasticsearch.service';
import { Category } from '../category/entities/category.entity';
import { Listing } from '../listing/entities/listing.entity';
import { ListingStatus } from '../listing/enums/listing.enum';

const CATEGORIES_INDEX =
  process.env.ELASTIC_CATEGORIES_INDEX ?? 'categories_v1';
const LISTINGS_INDEX = process.env.ELASTIC_LISTINGS_INDEX ?? 'listings_v1';

export interface SearchCategoriesResult {
  ids: string[];
  total: number;
}

export interface SearchListingsResult {
  ids: string[];
  total: number;
}

export interface ListingSearchFilters {
  status?: ListingStatus;
  categoryId?: string;
  cityId?: string;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  get isEnabled(): boolean {
    return this.elasticsearchService.isEnabled;
  }

  // ─── Index Management ───────────────────────────────────────────────────────

  async ensureIndices(): Promise<void> {
    if (!this.elasticsearchService.isEnabled) return;
    await this.ensureCategoriesIndex();
    await this.ensureListingsIndex();
  }

  private async ensureCategoriesIndex(): Promise<void> {
    const client = this.elasticsearchService.client;
    const exists = await client.indices.exists({ index: CATEGORIES_INDEX });
    if (exists) return;

    await client.indices.create({
      index: CATEGORIES_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },          publicId: { type: 'integer' },          nameEn: {
            type: 'text',
            analyzer: 'english',
            fields: { raw: { type: 'keyword' } },
          },
          nameAr: {
            type: 'text',
            analyzer: 'arabic',
            fields: { raw: { type: 'keyword' } },
          },
          descriptionEn: { type: 'text', analyzer: 'english' },
          descriptionAr: { type: 'text', analyzer: 'arabic' },
          createdAt: { type: 'date' },
        },
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    });
    this.logger.log(`Created index: ${CATEGORIES_INDEX}`);
  }

  private async ensureListingsIndex(): Promise<void> {
    const client = this.elasticsearchService.client;
    const exists = await client.indices.exists({ index: LISTINGS_INDEX });
    if (exists) return;

    await client.indices.create({
      index: LISTINGS_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: {
            type: 'text',
            analyzer: 'standard',
            fields: { raw: { type: 'keyword' } },
          },
          description: { type: 'text', analyzer: 'standard' },
          tags: { type: 'text', analyzer: 'standard' },
          categoryId: { type: 'keyword' },
          cityId: { type: 'keyword' },
          providerId: { type: 'keyword' },
          status: { type: 'keyword' },
          type: { type: 'keyword' },
          price: { type: 'double' },
          createdAt: { type: 'date' },
        },
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    });
    this.logger.log(`Created index: ${LISTINGS_INDEX}`);
  }

  // ─── Category Indexing ───────────────────────────────────────────────────────

  async indexCategory(category: Category): Promise<void> {
    if (!this.elasticsearchService.isEnabled) return;
    try {
      await this.elasticsearchService.client.index({
        index: CATEGORIES_INDEX,
        id: category.id,
        document: {
          id: category.id,
          publicId: category.publicId,
          nameEn: category.nameEn,
          nameAr: category.nameAr,
          descriptionEn: category.descriptionEn,
          descriptionAr: category.descriptionAr,
          createdAt: category.createdAt,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to index category ${category.id}`, err);
    }
  }

  async removeCategory(id: string): Promise<void> {
    if (!this.elasticsearchService.isEnabled) return;
    try {
      await this.elasticsearchService.client.delete({
        index: CATEGORIES_INDEX,
        id,
      });
    } catch {
      // ignore 404
    }
  }

  // ─── Listing Indexing ────────────────────────────────────────────────────────

  async indexListing(listing: Listing): Promise<void> {
    if (!this.elasticsearchService.isEnabled) return;
    try {
      await this.elasticsearchService.client.index({
        index: LISTINGS_INDEX,
        id: listing.id,
        document: {
          id: listing.id,
          name: listing.name,
          description: listing.description,
          tags: listing.tags,
          categoryId: listing.categoryId,
          cityId: listing.cityId,
          providerId: listing.providerId,
          status: listing.status,
          type: listing.type,
          price: Number(listing.price),
          createdAt: listing.createdAt,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to index listing ${listing.id}`, err);
    }
  }

  async removeListing(id: string): Promise<void> {
    if (!this.elasticsearchService.isEnabled) return;
    try {
      await this.elasticsearchService.client.delete({
        index: LISTINGS_INDEX,
        id,
      });
    } catch {
      // ignore 404
    }
  }

  // ─── Search ──────────────────────────────────────────────────────────────────

  /**
   * Search categories with tiered multi-language ranking:
   *   Tier 1 — exact phrase in name (^10)
   *   Tier 2 — phrase-prefix on name (^7, autocomplete)
   *   Tier 3 — cross_fields AND across name+description per language (all terms required)
   *   Tier 4 — fuzzy typo-tolerance on name only (prefix_length: 2)
   * min_score: 0.3 drops low-confidence matches (e.g. single-word hits in description).
   */
  async searchCategories(
    query: string,
    page: number,
    limit: number,
  ): Promise<SearchCategoriesResult> {
    if (!this.elasticsearchService.isEnabled) {
      return { ids: [], total: 0 };
    }

    const from = (page - 1) * limit;
    const publicIdValue = /^\d+$/.test(query.trim())
      ? parseInt(query.trim(), 10)
      : null;

    const response = await this.elasticsearchService.client.search({
      index: CATEGORIES_INDEX,
      from,
      size: limit,
      min_score: 0.3,
      query: {
        bool: {
          should: [
            // Tier 0: Exact publicId match — highest confidence
            ...(publicIdValue !== null
              ? [{ term: { publicId: { value: publicIdValue, boost: 15 } } }]
              : []),
            // Tier 1: Exact phrase match in name — highest precision
            {
              multi_match: {
                query,
                fields: ['nameEn^10', 'nameAr^10'],
                type: 'phrase',
              },
            },
            // Tier 2: Phrase prefix on name — autocomplete-style matching
            {
              multi_match: {
                query,
                fields: ['nameEn^7', 'nameAr^7'],
                type: 'phrase_prefix',
                max_expansions: 50,
              },
            },
            // Tier 3: All terms must appear across English name+description
            // (cross_fields requires same analyzer per group)
            {
              multi_match: {
                query,
                fields: ['nameEn^5', 'descriptionEn^2'],
                type: 'cross_fields',
                operator: 'and',
                analyzer: 'english',
              },
            },
            // Tier 3b: All terms must appear across Arabic name+description
            {
              multi_match: {
                query,
                fields: ['nameAr^5', 'descriptionAr^2'],
                type: 'cross_fields',
                operator: 'and',
                analyzer: 'arabic',
              },
            },
            // Tier 4: Fuzzy typo-tolerance on name only (not description)
            {
              multi_match: {
                query,
                fields: ['nameEn^3', 'nameAr^3'],
                type: 'best_fields',
                fuzziness: 1,
                prefix_length: 2,
                operator: 'or',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      sort: [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }],
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total as { value: number }).value;

    const ids = response.hits.hits.map((hit) => hit._id as string);

    return { ids, total };
  }

  /**
   * Search listings with tiered ranking and optional filter support:
   *   Tier 1 — exact phrase match in name (^10)
   *   Tier 2 — phrase-prefix on name (^7, autocomplete)
   *   Tier 3 — cross_fields AND across name+tags+description (all terms required)
   *   Tier 4 — fuzzy typo-tolerance on name only (fuzziness: 1, prefix_length: 2)
   * min_score: 0.3 applied only when a text query is present.
   */
  async searchListings(
    query: string,
    page: number,
    limit: number,
    filters: ListingSearchFilters = {},
  ): Promise<SearchListingsResult> {
    if (!this.elasticsearchService.isEnabled) {
      return { ids: [], total: 0 };
    }

    const from = (page - 1) * limit;
    const must: object[] = [];
    const filter: object[] = [];

    if (query && query.trim()) {
      must.push({
        bool: {
          should: [
            // Tier 1: Exact phrase match in name — highest precision
            {
              match_phrase: {
                name: { query, boost: 10 },
              },
            },
            // Tier 2: Phrase prefix on name — autocomplete-style
            {
              match_phrase_prefix: {
                name: { query, boost: 7, max_expansions: 50 },
              },
            },
            // Tier 3: All terms must appear across name + tags + description
            // (standard analyzer on all three — cross_fields works here)
            {
              multi_match: {
                query,
                fields: ['name^5', 'tags^3', 'description^1'],
                type: 'cross_fields',
                operator: 'and',
              },
            },
            // Tier 4: Fuzzy typo-tolerance on name only
            {
              match: {
                name: {
                  query,
                  fuzziness: 1,
                  prefix_length: 2,
                  boost: 2,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }

    if (filters.status) {
      filter.push({ term: { status: filters.status } });
    }
    if (filters.categoryId) {
      filter.push({ term: { categoryId: filters.categoryId } });
    }
    if (filters.cityId) {
      filter.push({ term: { cityId: filters.cityId } });
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const range: Record<string, number> = {};
      if (filters.minPrice !== undefined) range['gte'] = filters.minPrice;
      if (filters.maxPrice !== undefined) range['lte'] = filters.maxPrice;
      filter.push({ range: { price: range } });
    }

    const response = await this.elasticsearchService.client.search({
      index: LISTINGS_INDEX,
      from,
      size: limit,
      // Only apply a minimum score when there's a text query — not for filter-only requests
      ...(must.length > 0 ? { min_score: 0.3 } : {}),
      query: {
        bool: {
          ...(must.length > 0 ? { must } : {}),
          ...(filter.length > 0 ? { filter } : {}),
        },
      },
      sort: [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }],
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total as { value: number }).value;

    const ids = response.hits.hits.map((hit) => hit._id as string);

    return { ids, total };
  }

  // ─── Bulk Reindex ────────────────────────────────────────────────────────────

  async reindexCategories(): Promise<void> {
    if (!this.elasticsearchService.isEnabled) {
      this.logger.warn('Elasticsearch is disabled; skipping category reindex');
      return;
    }

    await this.ensureCategoriesIndex();

    const categories = await this.categoryRepository.find();
    this.logger.log(`Reindexing ${categories.length} categories…`);

    if (categories.length === 0) return;

    const operations = categories.flatMap((cat) => [
      { index: { _index: CATEGORIES_INDEX, _id: cat.id } },
      {
        id: cat.id,
        publicId: cat.publicId,
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
        descriptionEn: cat.descriptionEn,
        descriptionAr: cat.descriptionAr,
        createdAt: cat.createdAt,
      },
    ]);

    const bulk = await this.elasticsearchService.client.bulk({ operations });
    const erroredCount = bulk.items.filter((i) => i.index?.error).length;
    if (erroredCount > 0) {
      this.logger.error(`${erroredCount} category documents failed to index`);
    }
    this.logger.log(`Category reindex complete. Errors: ${erroredCount}`);
  }

  async reindexListings(): Promise<void> {
    if (!this.elasticsearchService.isEnabled) {
      this.logger.warn('Elasticsearch is disabled; skipping listing reindex');
      return;
    }

    await this.ensureListingsIndex();

    const listings = await this.listingRepository.find();
    this.logger.log(`Reindexing ${listings.length} listings…`);

    if (listings.length === 0) return;

    const operations = listings.flatMap((lst) => [
      { index: { _index: LISTINGS_INDEX, _id: lst.id } },
      {
        id: lst.id,
        name: lst.name,
        description: lst.description,
        tags: lst.tags,
        categoryId: lst.categoryId,
        cityId: lst.cityId,
        providerId: lst.providerId,
        status: lst.status,
        type: lst.type,
        price: Number(lst.price),
        createdAt: lst.createdAt,
      },
    ]);

    const bulk = await this.elasticsearchService.client.bulk({ operations });
    const erroredCount = bulk.items.filter((i) => i.index?.error).length;
    if (erroredCount > 0) {
      this.logger.error(`${erroredCount} listing documents failed to index`);
    }
    this.logger.log(`Listing reindex complete. Errors: ${erroredCount}`);
  }

  async reindexAll(): Promise<void> {
    await this.reindexCategories();
    await this.reindexListings();
  }

  /**
   * Fetch entities from DB in the same order returned by Elasticsearch.
   */
  async loadCategoriesById(ids: string[]): Promise<Category[]> {
    if (ids.length === 0) return [];
    const entities = await this.categoryRepository.find({
      where: { id: In(ids) },
    });
    // Preserve ES ranking order
    const map = new Map(entities.map((e) => [e.id, e]));
    return ids.map((id) => map.get(id)).filter(Boolean) as Category[];
  }

  async loadListingsById(ids: string[]): Promise<Listing[]> {
    if (ids.length === 0) return [];
    const entities = await this.listingRepository.find({
      where: { id: In(ids) },
      relations: ['provider', 'category', 'city'],
    });
    const map = new Map(entities.map((e) => [e.id, e]));
    return ids.map((id) => map.get(id)).filter(Boolean) as Listing[];
  }
}
