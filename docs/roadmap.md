# Roadmap

Backlog supplied by the product owner, ordered by dependency. Items marked with a status are done.

The list was clipped after "Rearrange lists by dragging them around"; the remaining items still need to be added here.

## 1. Look and feel

- [ ] In dark mode the background of lists is #1E1E1E, unless a photo is set, in which case the photo is always shown
- [ ] The sidebar color in dark mode is #252525
- [ ] Default theme color for lists is #6074C3
- [ ] Default theme color for All tasks is #F9E7DE
- [ ] Default theme color for Planned is #D5F1EE
- [ ] Completed check circles are filled with the list's background color with a white check
- [ ] Light and dark mode follow the system preference

## 2. Localization

- [ ] Localization support: default en-US, respect the browser or system locale, fall back to en-US for unsupported locales
- [ ] "Created a few moments ago" instead of "Created Today" where relevant; only the word "Created" is capitalized

## 3. Direct manipulation

- [ ] Resize either sidebar by dragging its edge
- [ ] Rename a list by clicking its name at the top on wide screens
- [ ] Shift, Ctrl or Cmd clicking selects multiple tasks
- [ ] Swipe gestures open and close the sidebars
- [ ] Completing a task fades in the check circle fill, then animates the task to the completed section behind the other items
- [ ] Rearrange lists by dragging them around

## 4. Context menus

- [ ] Right-click on a list: Create Group, Share List, Rename List, Print List, Delete List (the standalone Rename and trash buttons at the top are removed; on narrow screens these options are in the kebab menu)
- [ ] Right-click on a task: Add to My Day, Mark as Important, Mark as Completed, Due Today, Due Tomorrow, Pick a date, Create New List from This Task, Move Task to..., Delete Task
- [ ] Context menus, including right-click and the meatball menu, are native on desktop (Windows, macOS)

## 5. Real time

- [ ] WebSockets: when the app is open a socket is established and any change made in one client shows immediately in the others

## Dependencies

- Groups and sharing need new API entities
- Reordering lists needs an order field on lists
- Native context menus need the macOS and Windows targets
- WebSockets need an API Gateway WebSocket API (or equivalent) and a connection store
