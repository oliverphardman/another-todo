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
- DNS (infra/dns.tf): Route 53 zone another-todo.oliverhardman.dev with DNSSEC (KMS key in us-east-1, DS record in the dnssec_ds_record output). api.* is CloudFront in front of the Web Function (Host header must not be forwarded), auth.* is the Cognito custom domain, and the apex is reserved for the web client (it holds a placeholder A record that Cognito requires until the client is deployed). One us-east-1 ACM certificate covers all three names
- The app reads PUBLIC_API_URL for the MCP discovery metadata; the Web Function revision uses create_before_destroy because the endpoint pins the live revision
- apps/client is the Expo 58 / React Native 0.88 app (web via react-native-web). Layers: domain (Task, TodoList, DueDay, TaskView polymorphic views), storage (KeyValueStore adapters, LocalDatabase snapshot with an outbox), sync (Outbox compaction, SyncEngine push-then-pull, SyncCoordinator), auth (AuthenticationService, ExpoAuthorizationServer using Cognito code + PKCE), api (HttpApiGateway) and ui
- The client is offline first: every change is applied locally and queued as an Operation with a client generated id (the API accepts `id` on create so replays are idempotent). A change the server refuses with a permanent 4xx is dropped and counted, and SyncBanner tells the user
- Auth endpoints and the client id default to production in src/config/app-config.ts and can be overridden with EXPO_PUBLIC_API_URL, EXPO_PUBLIC_AUTH_URL and EXPO_PUBLIC_CLIENT_ID. Redirects are anothertodo://auth/callback natively and <origin>/auth/callback on the web. Allowed origins and callbacks are set in infra/main.tf (localhost:8081 and the apex)
- Client tests: vitest + jsdom with react-native aliased to react-native-web, react-native-svg stubbed (test/support), native modules mocked in test/support/setup.ts. UI tests render the real AppShell against a fake fetch. jsdom reports clientWidth 0, so tests set it in setViewport
- To look at the UI, build with `pnpm run build` and drive headless Chrome with a Cognito user's seeded `atd.tokens` in localStorage
- Not yet built: reminders, repeat, list themes, the macOS and Windows targets, and the Google and Microsoft identity providers (they need client credentials)
- Diagrams: docs/client.puml and docs/offline-sync.puml
- The web client is hosted at https://another-todo.oliverhardman.dev (infra/web.tf: private S3 bucket, CloudFront with origin access control, a viewer-request function that serves index.html for extensionless paths). Deploy with `AWS_PROFILE=another-todo infra/deploy-web.sh` (builds, syncs to S3, invalidates index.html)
- The Cognito domain must keep managed_login_version = 1 (the classic hosted UI). Version 2 shows "Login pages unavailable" until managed login branding exists
- Web sign-in opens the hosted UI in a popup (expo-web-browser); a headless-Chrome check must follow the new target
- If an interrupted `terraform apply` leaves a stale state lock, check for running terraform processes and partial changes before `terraform force-unlock`
- Completing a task plays apps/client/res/complete.mp3 through a SoundPlayer (ExpoSoundPlayer uses expo-audio, created lazily; failures are swallowed). TodoStore.toggleCompleted plays it only when a task becomes completed, from the list or the detail pane
- Sync feedback is deliberately quiet: there is no "Syncing" text. SyncIndicator (top right of the list pane) shows a red sync-off icon only while offline with changes waiting. SyncBanner is kept for the rare cases the user must act on: an expired session and changes the server refused
- The sidebar "New list" field (NewListField) autofocuses and matches the height of the row it replaces (SIDEBAR_ROW_HEIGHT) so nothing shifts; Enter or blur with text creates the list once, Escape or blur when empty cancels. When screenshotting with headless Chrome, do not take a screenshot between focusing a field and typing: it blurs the field
- My Day: tasks carry `myDay`, the YYYY-MM-DD day they were added (null when not). A task is in My Day only when that equals the client's local today, so the list resets each day without any server job. MyDayView is the default view, shows the long date under its title and gives new tasks myDay = today; the detail pane toggles it; TodoStore.refreshToday (a 60 second timer in App.tsx) rolls the day over in a long-running session
- My Day also includes tasks due today automatically. Task.isInMyDay(today) is true when myDay equals today, or when the due day equals today and myDayDismissed is not today. Removing a task from My Day sets myDay to null and myDayDismissed to today; adding it sets myDay to today and clears myDayDismissed. Both fields live on the server so devices agree
- The task details pane (task-detail-pane.tsx, detail-card.tsx, step-list.tsx) replicates the Microsoft To Do pane: a title card with steps and "Add step", My Day, a group of Remind me / due date / Repeat, Pick a category, Add file, a note card, and a footer with collapse, "Created ..." and delete. Steps and notes are stored on the task (API fields `steps` and `note`; a step list is replaced as a whole). Remind me, Repeat, Pick a category and Add file are rendered but disabled until they have backend support. The list can no longer be changed from the pane. The detail width is 320 (expanded) and 300 (medium)
- Sync invariant: an Operation being sent is marked `sending` and Outbox never merges new edits into it, otherwise an edit made during a send is deleted with that operation when it completes. Stale marks are cleared at the start of each run
- List options menu (list-menu.tsx, menu.tsx): the ⋯ button (⋮ on compact screens) opens Sort (Importance, Alphabetically, Due Date, Creation Date, Added to My Day; choosing the active one clears it), Change Theme…, Duplicate List (custom lists only), Print List and Hide/Show Completed Tasks. On compact screens Sort replaces the menu with a Back item instead of a flyout. Radio-style controls must set `aria-checked` directly because React Native Web ignores accessibilityState for them
- Per-view settings (sort, hideCompleted, theme) are stored per view id (a list id or a built-in id like my-day) on the server (`GET /view-settings`, `PUT /view-settings/{id}`), synced through the outbox as `putSettings` operations (latest unsent one wins) and merged on pull like other entities. Deleting a list deletes its settings
- Themes: a color (the first swatch, blue, means the default) recolors the list and detail panes' background and accent through ThemeOverride/ListTheme; a photo becomes the list background with a dark overlay. A photo whose link is not loaded falls back to the default look
- Photos: private S3 bucket (infra/photos.tf) with CORS for browser uploads. `POST /photos` registers a photo and returns a presigned POST form (content type and 1 byte to 5 MB enforced by the signature, image/jpeg, png or webp only); the client uploads straight to S3, then the photo appears in the theme menu. `GET /photos` returns 1 hour download links (PhotoLibrary refreshes every 30 minutes). `DELETE /photos/{id}` removes the object and record permanently and clears any theme using it. Uploads need a connection; they are not queued offline
- API CORS must list every method the client uses (GET, POST, PUT, PATCH, DELETE); a missing PUT silently kept view settings from saving in browsers
- Print List builds an HTML document (ListPrintDocument) and prints it with expo-print. The native image picker and printing are not verified on iOS or Android yet
