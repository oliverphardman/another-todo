# Sign in with Microsoft: app registration

Your server can let people sign in with a Microsoft account. It needs a Microsoft Entra app registration that you own. Leaving `AZURE_CLIENT_ID` or `AZURE_CLIENT_SECRET` blank turns the feature off, and the sign-in screen then shows only the username and password form.

## 1. Register the app

1. Open the [Microsoft Entra admin center](https://entra.microsoft.com) and go to **Identity > Applications > App registrations > New registration**.
2. Name it (for example "Another To Do").
3. Under **Supported account types** choose who may sign in:
   - **Personal Microsoft accounts only** — set `AZURE_TENANT_ID=consumers`.
   - **Accounts in any organizational directory and personal Microsoft accounts** — leave `AZURE_TENANT_ID` as `common`.
   - **Accounts in this organizational directory only** — set `AZURE_TENANT_ID` to your directory (tenant) id.
4. Under **Redirect URI** choose the **Web** platform and enter your server's callback address:

   ```
   https://todo.example.com/auth/microsoft/callback
   ```

   It is your `PUBLIC_API_URL` followed by `/auth/microsoft/callback`. For a trial on your own machine use `http://localhost:3000/auth/microsoft/callback`.

5. Select **Register**.

## 2. Create a client secret

1. In the registration open **Certificates & secrets > New client secret**.
2. Copy the secret **Value** immediately (it is shown once). Note when it expires; sign-in stops working then, so set a reminder to create a new one.

## 3. Configure the server

From the registration's **Overview** page copy the **Application (client) ID**, then set:

```
AZURE_CLIENT_ID=<application (client) id>
AZURE_CLIENT_SECRET=<secret value>
AZURE_TENANT_ID=common
PUBLIC_API_URL=https://todo.example.com
```

Restart the container. A **Continue with Microsoft** button appears on the sign-in screen.

## How it works

The app opens `/auth/microsoft/start` on your server, which sends the browser to Microsoft. Microsoft returns to `/auth/microsoft/callback` on your server, which exchanges the code using the client secret, then creates or finds the person's account (named `microsoft:<id>`, with their email address so lists can be shared with them) and returns them to the app signed in. The secret never leaves your server.

The first time someone signs in an account is created for them automatically. Anyone who can complete a Microsoft sign-in for the tenant types you allowed can therefore use your server. Restrict **Supported account types**, or set `AZURE_TENANT_ID` to your own directory, if that is not what you want.

## Returning to the app

After signing in the server redirects to the app. It only redirects to addresses it knows: `anothertodo://auth/callback` for the iOS, Android, macOS and Windows apps, and `<your address>/auth/callback` for the web app (including every origin in `CORS_ORIGINS`).
