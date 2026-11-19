# Another To Do

- NEVER write comments in any code.
- Ensure full test code coverage
- Aim for a diverse range of tests, including unit, integration, functional, E2E, acceptance, performance and smoke
- Use Terraform and AWS for infrastructure
- Place USEFUL agent context in AGENTS.md
- Aim for perfect UI replication of the original Microsoft To Do app, ensuring it is fully responsive and works on all screen sizes
- Use Conventional Commits. Regularly commit, but never push on your own.
- Create architecture diagrams and other artifacts where relevant in the "docs" directory. Use PlantUML (.puml) for most diagrams.
- Use U.S. English
- This is a monorepo. Create a folder for each package (api, client) in the "apps" directory.

## Architecture
- Use Expo/React Native
- Use the Microsoft packages to support macOS and Windows
- Use API Gateway and serverless-express.
- Write an OpenAPI definition file first. Use [openapi-typescript](https://github.com/openapi-ts/openapi-typescript) to generate types from it and [express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) to ensure compatibility.
- Use Amazon Cognito for authentication
- Add the Microsoft and Google external/social providers to Cognito

## Coding
- Aim for outstanding, perfect code quality
- Ensure OOP principles are maintained at all times. Consider the polymorphic, inherent, encapsulation and abstractive properties.
- Follow ACID principles

## Repo context
- apps/api is the serverless API: Express app wrapped by @codegenie/serverless-express, deployed behind API Gateway (HTTP API, Cognito JWT authorizer)
- apps/api/openapi.json is the source of truth. Run `pnpm run generate` after editing it to refresh src/generated/api.ts. express-openapi-validator validates requests and responses at runtime
- Layers: domain (immutable Task, TaskRepository), application (TaskService, TaskChanges), infrastructure (DynamoTaskRepository), http (controllers, Authenticator, ErrorHandler), mcp (McpServer JSON-RPC, tools)
- /mcp and the discovery route are mounted before the validator; /mcp is documented in the spec but handled by McpController
- The API Gateway authorizer enforces tokens; Authenticator reads the sub claim from the current invoke. The validator runs with validateSecurity: false
- Tests live in apps/api/test and use a FakeDocumentClient plus full API Gateway v2 events through the real Lambda handler (test/support)
- `pnpm run build` bundles dist/index.mjs, which infra/main.tf zips; build before terraform plan
- Every package needs lint, test (100% coverage thresholds) and format scripts run by .githooks/pre-commit
- pnpm 11 needs allowBuilds in pnpm-workspace.yaml for dependencies with install scripts
- Diagrams are in docs/*.puml
