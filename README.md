# Another To Do

> [!CAUTION]
> This software is in alpha. Any data you submit to the live demo may be retained and viewed by the maintainers. Use this software at your own risk!

Welcome to Another To Do (ATD)! This is designed to be a replacement for Microsoft To Do, which is closing in July 2027.

![Another To Do](docs/screenshot.png)

Check out the [live demo](https://another-todo.oliverhardman.dev/).

## Components

### API

Designed to run serverless for minimal cost.

- REST (Express on Amazon Lambda Web Functions)
- Oauth (Amazon Cognito)
- MCP

### Client

Expo/React Native client for managing your tasks.

Supports web, iOS, Android, [macOS](https://microsoft.github.io/react-native-macos/) and [Windows](https://microsoft.github.io/react-native-windows/).

## Features

- Sign in with a custom login or using a social provider (Microsoft, Google)
- Works offline

## Migration assistant

Tool which exports tasks from Microsoft To Do and (optionally) imports them into Another To Do (ATD).