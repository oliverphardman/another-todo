# Another To Do

> [!CAUTION]
> This software is in alpha. Any data you submit to the live demo may be retained and viewed by the maintainers. Use this software at your own risk!

Welcome to Another To Do (ATD)! This is designed to be a replacement for Microsoft To Do, which is closing in June 2027.

![Another To Do](docs/screenshot.png)

Check out the [live demo](https://itsanothertodo.app/).

## Components

### API

Designed to run serverless for minimal cost, or as a single Docker container.

- REST (Express on Amazon Lambda Web Functions, or in a container)
- Sign in with Amazon Cognito, with usernames and passwords, or with Microsoft
- MCP

The logic is independent of where it runs: databases, file storage, authentication and real time delivery are swappable providers (DynamoDB, S3, Cognito and API Gateway on AWS; SQLite, local disk and WebSockets in Docker).

### Client

Expo/React Native client for managing your tasks.

Supports web, iOS, Android, [macOS](https://microsoft.github.io/react-native-macos/) and [Windows](https://microsoft.github.io/react-native-windows/).

## Self-hosting

```sh
ADMIN_PASSWORD='choose-a-password' docker compose up -d
```

Then open http://localhost:3000. See [docs/self-hosting.md](docs/self-hosting.md) for all the settings and [docs/azure-app-registration.md](docs/azure-app-registration.md) to enable Sign in with Microsoft.

## Features

- Sign in with a custom login or using a social provider (Microsoft, Google)
- Works offline

## Migration assistant

Tool which exports tasks from Microsoft To Do and (optionally) imports them into Another To Do (ATD).