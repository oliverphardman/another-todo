# Changelog

## [1.1.2](https://github.com/oliverphardman/another-todo/compare/v1.1.1...v1.1.2) (2026-11-24)


### Fixes

* **client:** add the Swift compatibility header to the reminders pod search path ([18abc8f](https://github.com/oliverphardman/another-todo/commit/18abc8f38593d72547f9dcbbef42bac66f661597))

## [1.1.1](https://github.com/oliverphardman/another-todo/compare/v1.1.0...v1.1.1) (2026-11-23)


### Fixes

* **client:** import the Swift reminder header the way static pods expose it ([f87a078](https://github.com/oliverphardman/another-todo/commit/f87a0786c432e2aa31c5241e97a421394d557bb0))

## [1.1.0](https://github.com/oliverphardman/another-todo/compare/v1.0.0...v1.1.0) (2026-11-23)


### Features

* **api:** add a reminder time to tasks ([a0a2fe7](https://github.com/oliverphardman/another-todo/commit/a0a2fe7fd7799427c5065d7a7fa8c0009f713f2b))
* **api:** attach files to tasks ([ba666f3](https://github.com/oliverphardman/another-todo/commit/ba666f389386f41a9c9f75a088a5da598b5df3da))
* **client:** attach files to tasks with the Add file button ([4420d45](https://github.com/oliverphardman/another-todo/commit/4420d45d1a55bac5485794a5777c3d7e925e6a08))
* **client:** confirm dialogs with the Enter key ([a785445](https://github.com/oliverphardman/another-todo/commit/a785445166575a3c81d30ce433b679691bcb4743))
* **client:** reminder notifications on macOS (Swift) and Windows ([1668323](https://github.com/oliverphardman/another-todo/commit/1668323f706a25e3ccef75521ecc6240c4e1aa63))
* **client:** set reminders that notify through the browser or the device ([3133fd1](https://github.com/oliverphardman/another-todo/commit/3133fd1a092346e6794bb913ead6db4b69a7a8c2))
* **infra:** add an api_logging_enabled variable for API CloudFront logs and enable it for the demo ([6fa7bbb](https://github.com/oliverphardman/another-todo/commit/6fa7bbb4f41c7fdb7051d130b13a97b90867086e))
* **infra:** put the API logs bucket in the account-regional namespace ([e8b6a5a](https://github.com/oliverphardman/another-todo/commit/e8b6a5a563650c6c75192c4d97b9d0730c359f63))
* **infra:** use the account-regional namespace for every bucket ([0454e4e](https://github.com/oliverphardman/another-todo/commit/0454e4ea1c0e36f41bc6b053d42019e58267e32e))

## 1.0.0 (2026-11-23)


### ⚠ BREAKING CHANGES

* **api:** API Gateway is removed. The app validates Cognito access tokens itself and reads COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID instead of OAUTH_ISSUER. The default region is now eu-west-1 because Web Functions are not available in eu-west-2.

### Features

* **api:** accept client supplied ids so creation is idempotent ([eee5051](https://github.com/oliverphardman/another-todo/commit/eee5051a5ec4fe3ca732d6d9942c4a76882540c4))
* **api:** add per-view settings and a photo library with direct-to-S3 uploads ([6b0b193](https://github.com/oliverphardman/another-todo/commit/6b0b193a8c838befc8e5c6eb22917c636921317d))
* **api:** add REST task endpoints, MCP server and DynamoDB persistence ([ba67722](https://github.com/oliverphardman/another-todo/commit/ba677228309ff5505b65df0b35be2692289eea24))
* **api:** add SQLite, disk storage, password and enforced-user providers and a self-hosted server entry point ([e18acb2](https://github.com/oliverphardman/another-todo/commit/e18acb23efc3b9e333e3a5e34da1b65613a1d912))
* **api:** add steps and notes to tasks ([648a429](https://github.com/oliverphardman/another-todo/commit/648a429c9b09562b4187b495394a28a103551f53))
* **api:** add Task domain model and repository abstraction ([1283dc0](https://github.com/oliverphardman/another-todo/commit/1283dc0d7d62e6dbc263a0fb26f783c4c33426e5))
* **api:** add task lists, ESLint and DynamoDB Local integration tests ([3d688c1](https://github.com/oliverphardman/another-todo/commit/3d688c1707866ae9cce3625cbc96c084b2128d64))
* **api:** remember the day a task was removed from My Day ([646e3f0](https://github.com/oliverphardman/another-todo/commit/646e3f08fecf8a93ef5da563d0e8b71bc3999070))
* **api:** sign in with Microsoft on self-hosted servers when an app registration is configured ([8b7ffa6](https://github.com/oliverphardman/another-todo/commit/8b7ffa69bc1dd86d11b09a653707f0f338451334))
* **api:** store the day a task was added to My Day ([38698e6](https://github.com/oliverphardman/another-todo/commit/38698e6313d319022e5172dc72b9149532b0a663))
* **api:** tell clients where to connect for real time updates ([806e764](https://github.com/oliverphardman/another-todo/commit/806e764bfc025d61971a78849dc49121000557b8))
* **client:** add a list context menu and rename a list by clicking its title ([3220839](https://github.com/oliverphardman/another-todo/commit/32208399b793cb7fc08def3319cf2d8b7c7db6b4))
* **client:** add app icons so native projects generate, and tidy the build workflow ([b132ea9](https://github.com/oliverphardman/another-todo/commit/b132ea9d6184c460d887962736d8e0cd3eb2748f))
* **client:** add localization and relative created times ([65eef0a](https://github.com/oliverphardman/another-todo/commit/65eef0a1548e9aa13be4b58004ce602b6964bcdc))
* **client:** add macOS and Windows targets on React Native 0.83 with Expo 55 ([37d1661](https://github.com/oliverphardman/another-todo/commit/37d16614c26f0cf6e8145653a3e7275bcfd01775))
* **client:** add My Day ([79753ef](https://github.com/oliverphardman/another-todo/commit/79753efb94cea705d511fefad25a1310d856403a))
* **client:** add PWA manifest, icons, meta tags and OpenGraph cards ([ea90c68](https://github.com/oliverphardman/another-todo/commit/ea90c68b938168d8b70e4e276fafb262a0976656))
* **client:** add tasks due today to My Day unless the user removed them ([933f04e](https://github.com/oliverphardman/another-todo/commit/933f04e076563a6ef69907b476671e912d12e5be))
* **client:** add the Expo client with offline sync, Cognito sign-in and a responsive To Do UI ([2dc8a42](https://github.com/oliverphardman/another-todo/commit/2dc8a42e37854182ad71e674fa03f3e06bebb9aa))
* **client:** add the list options menu with sort, themes, uploaded photos, duplicate, print and hide completed ([72903d3](https://github.com/oliverphardman/another-todo/commit/72903d367324fda30bbf8da455167862ae12104d))
* **client:** connect to any server and replace the demo mode with an enforced server URL, password sign-in and a server notice ([9e0a0f3](https://github.com/oliverphardman/another-todo/commit/9e0a0f32cc160e0d0b2788c077f7a95c91bb2242))
* **client:** create groups from empty sidebar space and a small button ([86ec7a3](https://github.com/oliverphardman/another-todo/commit/86ec7a3c55e86ebb12939405a41ab3eab103ad47))
* **client:** native desktop menus, parallel completion motion and a sliding details pane ([dd5889f](https://github.com/oliverphardman/another-todo/commit/dd5889fd69a323e07fcc279a5366e8bd6472b9b3))
* **client:** offer Continue with Microsoft on the sign-in screen ([54543f4](https://github.com/oliverphardman/another-todo/commit/54543f41be31abda2e4873a0c4a86b983e14927e))
* **client:** per-view default theme colors, dark mode palette and a filled completion circle ([f31d8e3](https://github.com/oliverphardman/another-todo/commit/f31d8e31f63a9046cf0d723aca6a40dbbbc5d9e8))
* **client:** play the completion sound when a task is completed ([b21469c](https://github.com/oliverphardman/another-todo/commit/b21469c51131d63af4f0cb237bf914471d2db9be))
* **client:** promoted steps inherit importance, My Day and due date from their task ([46a9fc7](https://github.com/oliverphardman/another-todo/commit/46a9fc7be8da14068d1068d0bef201bdf77cf49f))
* **client:** redraw the brand check mark in the Microsoft To Do style ([b9611c8](https://github.com/oliverphardman/another-todo/commit/b9611c81c65174ba735e43ac2b124bf45087330b))
* **client:** replace the syncing text and offline banner with a sync-off icon ([f218198](https://github.com/oliverphardman/another-todo/commit/f218198c4274eb2ea326536b4eec8de9abef4350))
* **client:** replicate the Microsoft To Do task details pane with steps and notes ([c4e60ff](https://github.com/oliverphardman/another-todo/commit/c4e60ff01ca3107a7fb98a6246d095ea52a02bef))
* **client:** resize the sidebar and details pane by dragging their edges ([64e2ea3](https://github.com/oliverphardman/another-todo/commit/64e2ea3944cf471c3b1412921c655863ba1a9be5))
* **client:** search, step menus, native date input and faster completion ([e1c05cf](https://github.com/oliverphardman/another-todo/commit/e1c05cfe16dc2d90cdf8ca506c912bab4373d065))
* **client:** select several tasks and add a task context menu ([96e16ca](https://github.com/oliverphardman/another-todo/commit/96e16cabf7781f9bb31515a5e89b46e349fa1211))
* **client:** show a dismissible public demo banner on itsanothertodo.app ([9ecf800](https://github.com/oliverphardman/another-todo/commit/9ecf80089ae03720f524facd1e17326f8cee96f1))
* **client:** sign in with Microsoft on servers that offer it and stop a background sync racing a flaky list test ([e653c5e](https://github.com/oliverphardman/another-todo/commit/e653c5eff5a7beb6cb11ca35d157f8b17d647711))
* **client:** swipe gestures for the sidebar and an animated task completion ([c3383f5](https://github.com/oliverphardman/another-todo/commit/c3383f51c909b71272ee6b5251eac8e5c5c8a863))
* **client:** tell the user when the server refuses changes and document the client ([135efb8](https://github.com/oliverphardman/another-todo/commit/135efb83cc9fd4c6ef65e3ca2cac8a9152c99914))
* **client:** use the new group icon on the sidebar button ([e86a6db](https://github.com/oliverphardman/another-todo/commit/e86a6db24a61d14d48d461f914a9121d169e04d0))
* delete confirmation, draggable task order, tidier kebab menu, print only the list and more ([5c1a2bf](https://github.com/oliverphardman/another-todo/commit/5c1a2bfe12b7ab94d5d9e148ab8e944fa2ef57f3))
* enforce the configured username by default and add a Dockerfile and docker-compose.yml for self-hosting ([af40a26](https://github.com/oliverphardman/another-todo/commit/af40a26c1c0f8ebc54290b451b075938869d61a7))
* group lists in the sidebar with a groups API ([7ec77ab](https://github.com/oliverphardman/another-todo/commit/7ec77ab3d3b86c8901eaa9f023697a834d45c98f))
* **infra:** add Terraform for Cognito, DynamoDB, Lambda and API Gateway ([03a1409](https://github.com/oliverphardman/another-todo/commit/03a14094caf68238ab1e74aba80900d5253272b4))
* **infra:** add the lists table and routes ([0bf9a30](https://github.com/oliverphardman/another-todo/commit/0bf9a306fba90d15dd2ea6fcd40e8b459e2d5e94))
* **infra:** CI app registration with a GitHub federated credential ([a5307c4](https://github.com/oliverphardman/another-todo/commit/a5307c4b6c5ac28cfe8c761ef6aa90994fb60520))
* **infra:** create the Microsoft Entra app by default ([64692aa](https://github.com/oliverphardman/another-todo/commit/64692aa254538eeb9d9e141ee1c24cd20fcb4bd0))
* **infra:** enable DNSSEC and serve the API and hosted UI on custom domains ([3b31a3b](https://github.com/oliverphardman/another-todo/commit/3b31a3b4f991cdcc151a29915e9292f541d080db))
* **infra:** Entra app registration for Microsoft sign-in and a native build workflow ([bc1637f](https://github.com/oliverphardman/another-todo/commit/bc1637f7ed8a8ae868af8fe00eb9862a03cd07af))
* **infra:** host the web client at the apex and restore the classic hosted UI ([5c11d2b](https://github.com/oliverphardman/another-todo/commit/5c11d2be2846f848c755bd49b01209d7eb108ad5))
* **infra:** run the demo as an enforced user with a server notice instead of a shared Cognito account ([747d29d](https://github.com/oliverphardman/another-todo/commit/747d29d391ebbcba541992794c7ed4f803532c7d))
* **infra:** set the app icon on the Microsoft sign-in app registration ([3c22bc3](https://github.com/oliverphardman/another-todo/commit/3c22bc3c65e9a2088e47d8f63fa8ed35c5c4cca9))
* **infra:** store state in S3, add the Route 53 zone and fix the endpoint rate limit ([286dd10](https://github.com/oliverphardman/another-todo/commit/286dd10ddb2e1a37d65ba91b90b4bd7da0000811))
* less sloppy opengraph ([afde7a9](https://github.com/oliverphardman/another-todo/commit/afde7a94a2b9a1551765593c1a25fd6a416a9100))
* move the demo to itsanotherdemo.app and sign in as a default user ([01cd3af](https://github.com/oliverphardman/another-todo/commit/01cd3afd08e518992c0f5b372be2008c81cc94e3))
* push changes to other devices over a WebSocket API ([c11f942](https://github.com/oliverphardman/another-todo/commit/c11f9425b0fd5b8f33730666e2fba37aef3da85a))
* reorder lists by dragging them with a position field on the API ([03da805](https://github.com/oliverphardman/another-todo/commit/03da8055a76b4746bdcd75edc86f35c39cbd32dc))
* share lists with other people by email ([dc1176c](https://github.com/oliverphardman/another-todo/commit/dc1176ce586a389349418f9de72c47ee062f38b7))
* sort chip with a direction toggle, persisted as sortDescending, plus consistent reads ([fbf43f9](https://github.com/oliverphardman/another-todo/commit/fbf43f9b7847299880dd27e4284aad15c04ee6f5))
* sync with Microsoft To Do through Microsoft Graph after consent ([ca70990](https://github.com/oliverphardman/another-todo/commit/ca709905358ffb6b56ef23f55a608a4f7386b91c))


### Fixes

* **api:** allow PUT in the CORS policy so browsers can save view settings ([5f17223](https://github.com/oliverphardman/another-todo/commit/5f172232c8a9bcfaa99bb4a8967ea19a86eeeb00))
* **api:** upgrade vitest to 4.1.12 to patch vitest, tinypool and mocker advisories ([eec8ae5](https://github.com/oliverphardman/another-todo/commit/eec8ae5ba2d2a98cb70b52eb7fb192bf3e312848))
* **ci:** add the template keyword react-native-windows needs on the newest MSVC ([ff3f32e](https://github.com/oliverphardman/another-todo/commit/ff3f32eddf01d89c7964339a5201d8b8dc4fb69c))
* **ci:** apply the react-native-svg macOS import in the workflow instead of a pnpm patch ([6df4909](https://github.com/oliverphardman/another-todo/commit/6df490995deab0b94bd2de0c898377d06c5b1d60))
* **ci:** AWS OIDC deploy role and fixes for the native build jobs ([2bfac90](https://github.com/oliverphardman/another-todo/commit/2bfac90b9ea87de8e818d5335bdb606d83b68283))
* **ci:** Azure variables for every Terraform step, pnpm remove flag and the Windows bundle entry ([eca4a48](https://github.com/oliverphardman/another-todo/commit/eca4a4829dac43963d17beb24752692356d810ca))
* **ci:** build the macOS app for one architecture with quiet output ([5255a69](https://github.com/oliverphardman/another-todo/commit/5255a690a2ca624208018c83f5aa561e983bacbd))
* **ci:** compile the macOS menu module as Objective-C++ and pick one Visual Studio install ([df71b0e](https://github.com/oliverphardman/another-todo/commit/df71b0e31b2c93d17bd8d13c4eab0ddf4c6176d6))
* **ci:** correctly escape the macOS bundle script and link Windows native modules before building ([51c465f](https://github.com/oliverphardman/another-todo/commit/51c465f125ac97384ca76ebc837f1dddf920302f))
* **ci:** declare the macOS menu pod on the osx platform so CocoaPods keeps modern dispatch settings ([7cabe19](https://github.com/oliverphardman/another-todo/commit/7cabe192eba9f8a5b39afa48b7de8886b50dc3fe))
* **ci:** enable ARC for the macOS menu pod and install the UWP build tools on Windows ([489631b](https://github.com/oliverphardman/another-todo/commit/489631b7b56a3d656798f4c79334cef46f41badd))
* **ci:** force dispatch objects on for the macOS menu module and mark the Windows job experimental ([d960dbc](https://github.com/oliverphardman/another-todo/commit/d960dbcc498505a94954b6c254083a84b6858dec))
* **ci:** immutable OIDC subjects, drop unused desktop forks per job and add the Metro config ([83ea9a0](https://github.com/oliverphardman/another-todo/commit/83ea9a0129dba50577347c0090a2f6a449bb6754))
* **ci:** patch react-native-svg to import RCTAssert on macOS ([c68d6d5](https://github.com/oliverphardman/another-todo/commit/c68d6d51aef8097b2fe2520dc7469bd715c29fe3))
* **ci:** point react-native-windows at the tracing sources of react-native 0.83.10 ([72c0132](https://github.com/oliverphardman/another-todo/commit/72c0132f248e6231945888eb17895e398e11bc7f))
* **ci:** provide Base64.h for the react-native-windows ReactCommon patch ([9025913](https://github.com/oliverphardman/another-todo/commit/9025913e4c2268831d5151e263c7732efeaf29f7))
* **ci:** remove the duplicate UIApplication alias from expo-modules-core on macOS ([53ed83d](https://github.com/oliverphardman/another-todo/commit/53ed83df3ae985cfe09794e9e14aa47806789926))
* **ci:** retry the intermittent CocoaPods null byte failure on macOS ([c9c107a](https://github.com/oliverphardman/another-todo/commit/c9c107a941be3c50969050c093a4f11930c3e304))
* **ci:** skip the transitive Windows App SDK check for autolinked modules ([62063cf](https://github.com/oliverphardman/another-todo/commit/62063cfa53f0417fc2a15ff249131772ad33df65))
* **ci:** stop pinning SDK 58 Expo modules, set up Xcode, fix the macOS pod path and add the Babel runtime ([191abd5](https://github.com/oliverphardman/another-todo/commit/191abd598b1216cc17895ad911612afbc785e2da))
* **ci:** stop react-native-windows treating newest MSVC warnings as errors ([2cc27d6](https://github.com/oliverphardman/another-todo/commit/2cc27d6d5be392dffb54cf847e3eb2e6fc7a8de9))
* **client:** clip the fixed background photo to its pane so the sidebar stays visible ([484c329](https://github.com/oliverphardman/another-todo/commit/484c32940fc9e401fb26ce424ad022a2a0bc1abd))
* **client:** dismiss the list options menu when the user switches lists ([a32ce68](https://github.com/oliverphardman/another-todo/commit/a32ce68df0f3c4b22501c5c3ca670d1a1dd14469))
* **client:** focus the new list field and keep it aligned with the row it replaces ([f31fe08](https://github.com/oliverphardman/another-todo/commit/f31fe08ac6c102e9c068cb8a58fa8390f7070080))
* **client:** initialize the macOS app delegate properties before super.init ([b536172](https://github.com/oliverphardman/another-todo/commit/b53617241409784f767618e5c0fee0c34c1aa315))
* **client:** leave netinfo out of the Windows build and report it as always online ([e331f30](https://github.com/oliverphardman/another-todo/commit/e331f30ceac11f7570f749ee7925220ffd75e3df))
* **client:** leave the datetimepicker out of the Windows build ([f44c4d3](https://github.com/oliverphardman/another-todo/commit/f44c4d3ceba396ca022039e3dd308bb2edc7c8f0))
* **client:** never merge edits into an operation that is being sent ([8988343](https://github.com/oliverphardman/another-todo/commit/89883430c09c37421904e6c112168edf157cea59))
* **client:** override fast-xml-parser, glob, minimatch and zod to patched versions ([0a3b5a2](https://github.com/oliverphardman/another-todo/commit/0a3b5a2659f86414076deb8b8832e52edfaee1cb))
* **client:** point defaults at the us-east-1 Cognito pool and realtime API ([9e42980](https://github.com/oliverphardman/another-todo/commit/9e4298065b6266207ea1c236472b7329446dd7c3))
* **client:** rename delete group context menu option ([45809eb](https://github.com/oliverphardman/another-todo/commit/45809eb249f81c0959f8e68ce7fc5ce654b9e3c9))
* **client:** restore the UTF-16 byte order mark in the Windows resource script ([45417a9](https://github.com/oliverphardman/another-todo/commit/45417a9fef0c14916b7fc311f5e716f3e8e93ecb))
* **client:** sync only once a session exists and as soon as the user signs in ([3951bb5](https://github.com/oliverphardman/another-todo/commit/3951bb52b8eb547ac5d15cd55d908b828a9b61e7))
* **client:** tweak intro text ([d180e26](https://github.com/oliverphardman/another-todo/commit/d180e26fb166a667ea3b75400f2f8dbdfde5302f))
* **infra:** give the CI identity Application.ReadWrite.All instead of tracking app ownership ([cb63f8f](https://github.com/oliverphardman/another-todo/commit/cb63f8fd9f336ae8f5001260b2f4b86e3d63d93e))
* **infra:** let the CI identity read the directory so it can see app owners ([b923855](https://github.com/oliverphardman/another-todo/commit/b923855d5dcafb9763f25b677c06045371b37270))
* **infra:** register only the custom Cognito domain redirect ([338e0b7](https://github.com/oliverphardman/another-todo/commit/338e0b737c8e166974a70be7c998113d24e477ba))
* use itsanothertodo.app as the demo domain ([e29c9ba](https://github.com/oliverphardman/another-todo/commit/e29c9bab3733abb83895b4927fe83efbf789e8ae))
* use itsanothertodo.app throughout ([4574abb](https://github.com/oliverphardman/another-todo/commit/4574abb9388bccbd68163fd0d604e177a5957a7a))


### Refactoring

* **api:** host the API on Lambda Web Functions instead of serverless-express ([7fcef2e](https://github.com/oliverphardman/another-todo/commit/7fcef2ef0cf0ccf8496b1390628825425164bb18))

## Changelog

All notable changes to this project are documented here. This file is generated by [release-please](https://github.com/googleapis/release-please) from [Conventional Commits](https://www.conventionalcommits.org); do not edit it by hand.
