# Another To Do

- NEVER write comments in any code.
- Ensure full test code coverage
- Aim for a diverse range of tests, including unit, integration, functional, E2E, acceptance, performance and smoke
- Use Terraform and AWS for infrastructure
- Place USEFUL agent context in AGENTS.md
- Use Conventional Commits. Regularly commit, but never push on your own.
- Create architecture diagrams and other artifacts where relevant in the "docs" directory. Use PlantUML (.puml) for most diagrams.
- Use U.S. English
- This is a monorepo. Create a folder for each package (api, client) in the "apps" directory.

## Architecture
- Use Expo/React Native
- Use the Microsoft packages to support macOS and Windows
- The API runs as an Express app on an Amazon Lambda Web Function (no adapter, no API Gateway). Cognito JWTs are validated in the app.
- Write an OpenAPI definition file first. Use [openapi-typescript](https://github.com/openapi-ts/openapi-typescript) to generate types from it and [express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) to ensure compatibility.
- Use Amazon Cognito for authentication
- Add the Microsoft and Google external/social providers to Cognito

## Coding
- Aim for outstanding, perfect code quality
- Ensure OOP principles are maintained at all times. Consider the polymorphic, inherent, encapsulation and abstractive properties.
- Follow ACID principles

## Node.js
- Use ESM over CommonJS wherever possible
- Use TypeScript over JavaScript wherever possible, ensuring we strictly enforce types
- Use ESLint
- Use Prettier
- Use pnpm over npm

## API
- Use Amazon Lambda Web Functions to host the API rather than serverless-express

## Client
- Aim for perfect UI replication of the original Microsoft To Do app, ensuring it is fully responsive and works on all screen sizes
- Ensure it works offline, syncing to the server when its connection is restored

## Repo context
- apps/api is the serverless API: a plain Express server that binds to AWS_LAMBDA_HTTP_ENDPOINT (src/main.ts) on an Amazon Lambda Web Function with ApplicationManaged auth. Web Functions are only in us-east-1, us-east-2, us-west-2, ap-northeast-1 and eu-west-1 (default region is eu-west-1)
- apps/api/openapi.json is the source of truth. Run `pnpm run generate` after editing it to refresh src/generated/api.ts. express-openapi-validator validates requests and responses at runtime
- Layers: domain (immutable Task and TodoList, repository interfaces), application (TaskService, TaskChanges), infrastructure (DynamoTaskRepository), http (controllers, Authenticator, ErrorHandler), mcp (McpServer JSON-RPC, tools)
- /mcp and the discovery route are mounted before the validator; /mcp is documented in the spec but handled by McpController
- BearerAuthenticator verifies the Cognito access token with aws-jwt-verify (CognitoTokenVerifier) and uses its sub claim as the owner. CorsPolicy handles CORS (CORS_ORIGINS). The OpenAPI validator runs with validateSecurity: false
- `pnpm run test:integration` in apps/api runs the handler and repositories against DynamoDB Local via Docker (integration/); `pnpm run lint` runs ESLint then tsc
- Tests live in apps/api/test and send real HTTP requests to a listening Express app backed by a FakeDocumentClient (test/support)
- `pnpm run build` bundles dist/index.mjs (build.mjs adds a createRequire banner), which infra/main.tf zips and uploads to a versioned S3 bucket; build before terraform plan. The entry file is selected with AWS_LAMBDA_NODEJS_ENTRYPOINT=index.mjs
- Every package needs lint, test (100% coverage thresholds) and format scripts run by .githooks/pre-commit
- pnpm 11 needs allowBuilds in pnpm-workspace.yaml for dependencies with install scripts
- Diagrams are in docs/*.puml
- Terraform state lives in the S3 bucket another-todo-tfstate-<account>-eu-west-1-an (account regional namespace, S3 native locking). The bucket is created by infra/bootstrap (local state, run once). Deploy with AWS_PROFILE=another-todo from infra/ after building apps/api
- Web Function rate_limit must be a multiple of 100 (0, 100 ... 1000, then thousands)
- Route 53 zone another-todo.oliverhardman.dev is managed in infra/main.tf; delegate to its name_servers output from the parent domain
