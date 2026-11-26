# Self-hosting

Another To Do runs as a single container: the API, a SQLite database, local photo storage, real time updates and the web app.

You are responsible for your own domain and TLS. Put the container behind a reverse proxy (Caddy, nginx, Traefik) that terminates HTTPS and forwards WebSocket upgrades.

## Quick start

```sh
git clone https://github.com/oliverphardman/another-todo.git
cd another-todo
ADMIN_PASSWORD='choose-a-password' docker compose up -d
```

Open http://localhost:3000 and sign in as `admin`.

If you leave `ADMIN_PASSWORD` blank on first start, a random password is generated and printed once in the container log (`docker compose logs another-todo`).

Your data lives in the `data` volume (`/data` in the container): the SQLite database, uploaded photos and the key that signs sessions. Back up that volume.

## Settings

Everything is an environment variable. Set them in your shell, in a `.env` file next to `docker-compose.yml`, or edit the file.

| Variable                                         | Default                 | What it does                                                                                                                                                   |
| ------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_API_URL`                                 | `http://localhost:3000` | The address people reach the server at, including `https://`. Used in links to uploaded photos and for sign-in redirects. Set it when you add a domain.         |
| `ADMIN_PASSWORD`                                 | generated               | Sets the `admin` password every time the container starts. Remove it afterwards to keep the password you changed it to; the stored password then stays as is. |
| `ADMIN_USERNAME`                                 | `admin`                 | Name of the first (administrator) account.                                                                                                                     |
| `ENFORCED_USERNAME`                              | none                    | Bypasses authentication entirely: every request is served as this one user. Use it only on a private network.                                                  |
| `ENFORCED_SERVER_URL`                            | this server             | Locks the bundled web app to a server. Leave it blank to use the server that hosts the web app.                                                                |
| `SERVER_NOTICE`                                  | none                    | A yellow notice shown to everyone at the top of the app (for example "This is a shared demo").                                                                 |
| `CORS_ORIGINS`                                   | none                    | Comma-separated origins allowed to call the API from a browser, for a web app hosted somewhere else.                                                           |
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`         | none                    | Turns on Sign in with Microsoft. See [azure-app-registration.md](azure-app-registration.md). Leave blank to disable it.                                        |
| `AZURE_TENANT_ID`                                | `common`                | Which Microsoft accounts may sign in: `common`, `consumers`, `organizations` or a tenant id.                                                                   |
| `MAX_UPLOAD_MB`                                  | `10`                    | Largest file that can be attached to a task, in megabytes. Photos are also limited to 5 MB.                                                                    |
| `SECRET_KEY`                                     | generated and stored    | Key that signs sessions and photo links. Set it to share sessions between replicas.                                                                            |
| `PORT`                                           | `3000`                  | Port the server listens on. With Docker Compose it is instead the port published on your machine; the container always listens on 3000.                         |
| `DATA_DIR`                                       | `/data`                 | Where the database and photos are stored.                                                                                                                      |
| `DATA_PROVIDER`, `MEDIA_PROVIDER`, `AUTH_PROVIDER`, `REALTIME_PROVIDER` | `sqlite`, `disk`, `password`, `websocket` | Which providers the server uses. See below.                                                                          |

## Accounts

The administrator creates other accounts with the API:

```sh
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"..."}' | jq -r .accessToken)

curl -X POST http://localhost:3000/auth/users \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"username":"sam","password":"a long password","email":"sam@example.com"}'
```

Lists are shared with other people by the email address (or username) of their account.

## Clients

- **Web:** served by the container at its address. It always uses that server.
- **iOS, Android, macOS, Windows:** use the builds attached to each GitHub release. At first start the app asks for your server address. The address is saved; **Change server** on the sign-in screen forgets it, and also removes the local copy of the previous server's tasks so they are never sent to the new one.
- **Building a client yourself:** set `EXPO_PUBLIC_ENFORCED_SERVER_URL` at build time to lock the build to your server and skip the prompt.

## Behind a reverse proxy

Forward everything, including WebSocket upgrades on `/realtime`, to port 3000. With Caddy:

```
todo.example.com {
	reverse_proxy localhost:3000
}
```

Then set `PUBLIC_API_URL=https://todo.example.com`.

## Swapping providers

The logic never talks to a database, file store or identity service directly. It depends on small interfaces, and each is chosen by a variable:

| Variable            | Choices                 | Notes                                                       |
| ------------------- | ----------------------- | ----------------------------------------------------------- |
| `DATA_PROVIDER`     | `sqlite`                | `dynamodb` in the AWS build                                 |
| `MEDIA_PROVIDER`    | `disk`                  | `s3` in the AWS build                                       |
| `AUTH_PROVIDER`     | `password`, `enforced`  | `cognito` in the AWS build. `enforced` is chosen automatically when `ENFORCED_USERNAME` is set |
| `REALTIME_PROVIDER` | `websocket`             | `apigateway` in the AWS build                               |

The same code also runs serverless on AWS (Lambda Web Functions, DynamoDB, S3, Cognito, API Gateway); see [api.puml](api.puml) and the `infra` directory. [providers.puml](providers.puml) shows how the pieces fit together. To add another database or storage backend, add one provider under `apps/api/src/infrastructure` and register it in the entry point; nothing else changes.

## Updating

```sh
git pull
docker compose up -d --build
```

The database is created and upgraded on start. Nothing in the volume is touched.
