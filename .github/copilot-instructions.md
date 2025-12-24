# Wesal API - AI Coding Agent Instructions

## Project Overview
**Wesal API** is a NestJS GraphQL API with PostgreSQL database using TypeScript, TypeORM, and Jest testing. The application follows NestJS's modular architecture with clear separation between entity/domain code (`src/`) and shared utilities/infrastructure (`lib/`).

## Project Structure

### Folder Organization
- **`src/`** - Entity and domain-driven code
  - `app.module.ts` - Root module (imports from lib for utilities)
  - `{feature}/` - Feature modules (entities, resolvers, services)
    - `{feature}.entity.ts` - TypeORM entities
    - `{feature}.resolver.ts` - GraphQL resolvers
    - `{feature}.service.ts` - Business logic
    - `{feature}.module.ts` - Feature module definition
- **`lib/`** - Shared utilities and infrastructure code
  - `app/` - Root application handlers
    - `app.controller.ts` - REST endpoints (if needed)
    - `app.service.ts` - Shared services
  - `database/` - TypeORM database configuration
    - `database.module.ts` - PostgreSQL connection setup
  - `graphql/` - Apollo GraphQL configuration
    - `graphql.module.ts` - GraphQL server setup
  - `{utility}/` - Other shared utilities
- **`test/`** - E2E tests using Jest + Supertest

## Architecture & Key Components

### Technology Stack
- **Framework**: NestJS 11
- **GraphQL**: Apollo Server 5 with `@nestjs/graphql` and `@nestjs/apollo`
- **Database**: PostgreSQL with TypeORM 0.3
- **ORM**: TypeORM for entity and query management
- **Validation**: `class-validator` and `class-transformer` for DTO validation
- **Config**: `@nestjs/config` for environment management

### NestJS Module Pattern
All features must be organized as feature modules. The pattern:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],  // Database entities
  providers: [FeatureResolver, FeatureService],    // GraphQL resolver + business logic
  exports: [FeatureService]                        // What other modules can use
})
export class FeatureModule {}
```
Then import into `app.module.ts`. See [src/app.module.ts](../src/app.module.ts).

### GraphQL Resolver Pattern
Use `@Resolver()` decorator for GraphQL queries/mutations:
```typescript
@Resolver(() => Entity)
export class FeatureResolver {
  constructor(private readonly featureService: FeatureService) {}

  @Query(() => [Entity])
  async entities() {
    return this.featureService.findAll();
  }

  @Mutation(() => Entity)
  async createEntity(@Args('input') input: CreateEntityInput) {
    return this.featureService.create(input);
  }
}
```

### TypeORM Entity Pattern
Define entities for database tables:
```typescript
@Entity()
export class Entity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Dependency Injection
Use NestJS `@Injectable()` for services and inject via constructor. Example: [lib/app/app.service.ts](../lib/app/app.service.ts).

## Development Workflows

### Installation & Scripts
Package manager: **pnpm** (locked via `pnpm-lock.yaml`)

Key commands (all use `pnpm`):
- `pnpm install` - Install dependencies
- `pnpm run start:dev` - Development server with file watch
- `pnpm run build` - Compile TypeScript to `dist/`
- `pnpm run test` - Unit tests (Jest, files: `*.spec.ts`)
- `pnpm run test:e2e` - E2E tests using Supertest
- `pnpm run test:cov` - Coverage report
- `pnpm run lint` - ESLint with auto-fix
- `pnpm run format` - Prettier formatting

### Testing Pattern
- **Unit tests**: `src/**/*.spec.ts` using Jest
- **E2E tests**: `test/**/spec.ts` with Test.createTestingModule()
- Example: [test/app.e2e-spec.ts](../test/app.e2e-spec.ts)

## Code Conventions & Patterns

### TypeScript & Linting
- **ESLint**: Flat config ([eslint.config.mjs](../eslint.config.mjs))
  - Uses `@typescript-eslint` with type checking via `projectService`
  - Disables `@typescript-eslint/no-explicit-any`
  - Warns on floating promises
- **Prettier**: Single quotes, trailing commas ([.prettierrc](../.prettierrc))
- **TypeScript**: Strict mode, ES2020+ target (see [tsconfig.json](../tsconfig.json))

### NestJS Decorators
- `@Module()` - Feature definition
- `@Resolver()` - GraphQL resolver class
- `@Query()` - GraphQL query
- `@Mutation()` - GraphQL mutation
- `@Subscription()` - GraphQL subscription
- `@Args()` - GraphQL arguments
- `@Injectable()` - Service/provider
- Constructor injection for dependencies

### File Naming
- Resolvers: `*.resolver.ts`
- Services: `*.service.ts`
- Modules: `*.module.ts`
- Entities: `*.entity.ts`
- DTOs: `*.dto.ts` or `create-*.dto.ts`, `update-*.dto.ts`
- Tests: `*.spec.ts`

## Critical Patterns to Follow

1. **No magic values**: Use `process.env.PORT ?? 3000` pattern for config
2. **Module isolation**: Always export from parent module before using in sibling modules
3. **Error handling**: Use NestJS `HttpException` and `NotFoundException` for HTTP errors
4. **Testing**: Create test module with `Test.createTestingModule()`, don't start real server for unit tests

## When Adding Features

1. Create feature module in `src/feature/feature.module.ts`
2. Create entity: `src/feature/feature.entity.ts`
3. Create resolver: `src/feature/feature.resolver.ts`
4. Create service: `src/feature/feature.service.ts`
5. Create input DTOs: `src/feature/dto/create-feature.input.ts`, `update-feature.input.ts`
6. Add tests: `src/feature/*.spec.ts` and `lib/app/*.spec.ts` for utilities
7. Import module in [src/app.module.ts](../src/app.module.ts)
8. Run `pnpm run lint --fix` before committing

## Environment & Runtime
- **Node**: v22+ (from package.json `@types/node`)
- **Runtime**: Uses Express via `@nestjs/platform-express`
- **Port**: Configurable via `PORT` env var, defaults to 3000
- **Build output**: `dist/` directory (auto-deleted on rebuild via `nest-cli.json`)
