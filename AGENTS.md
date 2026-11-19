# Another To Do

- NEVER write comments in any code.
- Ensure full test code coverage
- Aim for a diverse range of tests, including unit, integration, functional, E2E, acceptance, performance and smoke
- Use Terraform and AWS for infrastructure
- Place USEFUL agent context in AGENTS.md
- Aim for perfect UI replication of the original To Do app, ensuring it is fully responsive
- Use Conventional Commits. Regularly commit, but never push on your own.

## Architecture
- Use Expo/React Native
- Use the Microsoft packages to support macOS and Windows

## Coding
- Aim for outstanding, perfect code quality
- Ensure OOP principles are maintained at all times. Consider the polymorphic, inherent, encapsulation and abstractive properties.
- Follow ACID principles
## Repo context
- pnpm packages live in apps/*; each exposes lint (tsc), test (vitest, 100% coverage thresholds) and format (prettier) scripts run by .githooks/pre-commit
- apps/api/src/domain holds the framework-free domain: immutable Task entity and the TaskRepository abstraction with an in-memory implementation
- pnpm 11 needs allowBuilds in pnpm-workspace.yaml for dependencies with install scripts
