# Roadmap

Backlog supplied by the product owner, ordered by dependency. Items marked with a status are done.

The list was clipped after "Rearrange lists by dragging them around"; the remaining items still need to be added here.

## 1. Look and feel

- [x] In dark mode the background of lists is #1E1E1E, unless a photo is set, in which case the photo is always shown
- [x] The sidebar color in dark mode is #252525
- [x] Default theme color for lists is #6074C3
- [x] Default theme color for All tasks is #F9E7DE
- [x] Default theme color for Planned is #D5F1EE
- [x] Completed check circles are filled with the list's color with a white check (the fade-in and move-to-completed animation is still to do, see section 3)
- [x] Light and dark mode follow the system preference
- [x] Royalty-free photos included in the theme menu (docs/theme-images.md)

## 2. Localization

- [x] Localization support: default en-US, respect the browser or system locale, fall back to en-US for unsupported locales
- [x] "Created a few moments ago" instead of "Created Today" where relevant; only the word "Created" is capitalized

## 3. Direct manipulation

- [x] Resize either sidebar by dragging its edge (web and desktop; arrow keys and double-click to reset also work, widths are remembered)
- [x] Rename a list by clicking its name at the top on wide screens
- [x] Shift, Ctrl or Cmd clicking selects multiple tasks (on macOS Ctrl+click is the system's right-click, so Cmd+click is the toggle there)
- [x] Swipe gestures open and close the sidebars (narrow screens: swipe right opens the lists, left closes them, right closes the task details)
- [x] Completing a task fades in the check circle fill, then animates the task to the completed section behind the other items
- [x] Rearrange lists by dragging them around (mouse drag on web and desktop; Move List Up/Down in the list menu for touch)

## 4. Context menus

- [x] Right-click on a list: Rename List, Print List, Delete List; the standalone Rename and trash buttons are removed and the same options are in the list options menu (Create Group and Share List are built)
- [x] Right-click on a task (long press on touch): Add to My Day, Mark as Important, Mark as Completed, Due Today, Due Tomorrow, Pick a date, Create New List from This Task, Move Task to..., Delete Task
- [x] Context menus, including right-click and the meatball menu, are native on desktop (Windows, macOS): NativeMenu bridge in the client, an Objective-C module for macOS and a Win32 module for Windows; neither has been built or run on a device yet
- [x] Context menus and the list options button are native on Android (a popup menu) and iOS (an action sheet); iOS has not been run

## 5. Real time

- [x] WebSockets: when the app is open a socket is established and any change made in one client shows immediately in the others (docs/realtime.puml)

## 6. Polish

- [x] Much faster completion animation, the completion sound plays as soon as the circle is clicked, and clicking the list background deselects tasks
- [x] Removed the "No tasks here yet" text
- [x] Search bar in the left sidebar above My Day
- [x] The due date menu uses the platform's date input (a date field on the web, the system picker on native)
- [x] Add file attaches files to a task (10 MB by default, set by the server); they can be opened and removed from the details pane
- [x] Each step has a menu: Mark as completed, Promote to task, Delete step

- [x] Completed tasks move while the circle fills, and the right pane slides in and out
- [x] Repeat tasks daily, weekly on chosen days, monthly or yearly

## 6. Self-hosting

- [x] The logic is independent of the infrastructure: DataStore, MediaStorage, Authenticator and ChangeChannel ports with AWS (DynamoDB, S3, Cognito, API Gateway), local (SQLite, disk, passwords, WebSockets) and in-memory providers (docs/providers.puml)
- [x] Dockerfile and docker-compose.yml: one container with the API, SQLite, photo storage, real time and the web app
- [x] Enforced server URL, enforced username (no authentication) and a temporary admin password variable
- [x] Clients ask for the server address, remember it and keep each server's data apart
- [x] Sign in with Microsoft on self-hosted servers when an app registration is configured (docs/azure-app-registration.md)
- [x] The demo is an ordinary deployment (enforced server URL and user, plus a notice)
- [ ] Publish the container image to a registry
- [ ] A generic OpenID Connect auth provider

## 7. Settings

- [x] A settings window, opened from the menu bar on macOS and from a gear elsewhere, with logging out at the bottom
- [x] Cozy or compact rows with a live preview, and the add task bar at the top or bottom
- [x] Choose whether to receive from and send to Microsoft To Do, and how often
- [x] Show or hide the All, Important, Planned and Completed lists
- [x] My Day can show yesterday's unfinished tasks and can leave out tasks that are only due today
- [ ] Sync settings between devices

## 8. Export

- [x] Export the current list or every list to CSV, XLSX, JSON or PDF from the list menus and the macOS List menu, through the system save dialog
- [x] Export chosen lists from Settings, with Select all
- [ ] PDF export on Windows

## Dependencies

- Reordering lists needs an order field on lists
- Native context menus need the macOS and Windows targets
- WebSockets need an API Gateway WebSocket API (or equivalent) and a connection store
