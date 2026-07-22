# API deployment and GraphQL schema synchronization

Use this sequence whenever an API change affects the GraphQL contract. The
deployed API is the schema source for both Next.js applications, so generating
frontend types before the API deployment can leave the repositories out of
sync.

## Required sequence

1. Implement and verify the API change in `wesal-api`.
2. Commit and push the API branch. Create and merge a pull request into the
   branch used by the Coolify application.
3. Use the Coolify CLI to confirm that the deployment for the merged commit has
   completed successfully. Check the deployment status and application logs;
   do not continue while a deployment is queued, running, or unhealthy.
4. After the deployed GraphQL endpoint exposes the new contract, refresh each
   affected frontend from its own directory:

   ```bash
   cd ../wesal-web
   sh ./schema.sh

   cd ../wesal-admin
   sh ./schema.sh
   ```

   Each script downloads the live schema and runs GraphQL code generation.
   Never hand-edit `schema.graphql`, `graphql.schema.json`, `src/gql/`, or the
   admin Swagger types.
5. Review the generated diff, then run the affected frontend's lint and build
   checks. Commit generated files together with the GraphQL operation that
   required them.

## Coolify checks

Select the configured context explicitly when it is not already the default,
then identify the application and inspect its latest deployment:

```bash
coolify --context <context> app list
coolify --context <context> app deployments list <application-uuid>
coolify --context <context> app logs <application-uuid>
```

Use `coolify deploy uuid <application-uuid>` only when the application does not
auto-deploy the merged commit. The deployment is ready only when the latest
record is successful, its commit matches the merged API commit, and the
application health check passes.
