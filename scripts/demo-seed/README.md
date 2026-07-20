# Coolify testing demo-data loader

This command creates deterministic demo accounts, uploaded media, listings, and
conversations by calling the deployed testing API. It never opens a database
connection and refuses every host except `https://wesal-api.testing3000.cloud`.

## Preflight only

```bash
DEMO_ADMIN_EMAIL='admin@example.com' \
DEMO_ADMIN_PASSWORD='...' \
DEMO_ACCOUNT_PASSWORD='...' \
pnpm run seed:demo:api -- --target testing --confirm testing --dry-run
```

## Create or resume fixtures

```bash
DEMO_ADMIN_EMAIL='admin@example.com' \
DEMO_ADMIN_PASSWORD='...' \
DEMO_ACCOUNT_PASSWORD='...' \
pnpm run seed:demo:api -- --target testing --confirm testing
```

The first full run uses the normal registration flow. It therefore sends 11
verification emails (10 providers and one customer); SMS is mocked by the API.
The testing OTP defaults to `1234` and can be overridden with `DEMO_OTP`.

The loader creates 10 listings per active category for each of 10 providers. It
uploads the bundled real-photo pool once and reuses the resulting remote files
with unique media records. A local, ignored `.demo-seed-state/testing.json`
cache makes interrupted uploads resumable. Existing accounts, fixture-marked
listings, and starter conversations are reused rather than duplicated.

At the end, the loader subscribes directly to
`wss://wesal-api.testing3000.cloud/graphql`, sends a provider message, and fails
if the customer does not receive the `messageAdded` event.

Use `--concurrency 1` through `--concurrency 5` to reduce load on the testing
deployment. Five is the default and hard maximum.

## Refreshing bundled photos

The committed image pack has a per-file source and license manifest. Refresh it
only when the active category set changes:

```bash
pnpm run seed:demo:assets
```

This replaces `scripts/demo-seed/assets` with a new category-matched Openverse
photo pack restricted to modification/commercial-compatible Creative Commons
licenses. It is not part of normal seeding; ordinary runs use only the
committed files.
