import { Client } from '@elastic/elasticsearch';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private _client: Client | null = null;
  private _enabled = false;

  onModuleInit() {
    this._enabled = process.env.ELASTIC_ENABLED === 'true';

    if (!this._enabled) {
      this.logger.warn('Elasticsearch is disabled (ELASTIC_ENABLED != true)');
      return;
    }

    const node = process.env.ELASTIC_NODE || 'http://localhost:9200';
    const apiKey = process.env.ELASTIC_API_KEY;
    const username = process.env.ELASTIC_USERNAME;
    const password = process.env.ELASTIC_PASSWORD;

    const auth = apiKey
      ? { apiKey }
      : username && password
        ? { username, password }
        : undefined;

    this._client = new Client({ node, ...(auth ? { auth } : {}) });
    this.logger.log(`Elasticsearch client connected to ${node}`);
  }

  get isEnabled(): boolean {
    return this._enabled;
  }

  get client(): Client {
    if (!this._client) {
      throw new Error('Elasticsearch is not enabled or not initialized');
    }
    return this._client;
  }
}
