import SwiftUI
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
struct AnotherToDoApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

  var body: some Scene {
    Window("Another To Do", id: "main") {
      ReactNativeView(factory: appDelegate.reactNativeFactory)
        .ignoresSafeArea()
    }
    .windowStyle(.hiddenTitleBar)
    .defaultSize(width: 1280, height: 720)

    Settings {
      SettingsView()
    }
  }
}

// MARK: - App Delegate

class AppDelegate: NSObject, NSApplicationDelegate {
  private let reactNativeDelegate: ReactNativeDelegate
  let reactNativeFactory: RCTReactNativeFactory

  override init() {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    _ = SettingsStore.shared
    super.init()
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSAppleEventManager.shared().setEventHandler(
      RCTLinkingManager.self,
      andSelector: NSSelectorFromString("getUrlEventHandler:withReplyEvent:"),
      forEventClass: AEEventClass(kInternetEventClass),
      andEventID: AEEventID(kAEGetURL)
    )
  }
}

// MARK: - React Native Delegate

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// MARK: - React Native SwiftUI View

struct ReactNativeView: NSViewRepresentable {
  let factory: RCTReactNativeFactory

  func makeNSView(context: Context) -> NSView {
    let view = factory.rootViewFactory.view(withModuleName: "main")
    (view as? RCTSurfaceHostingProxyRootView)?.backgroundColor = .windowBackgroundColor
    return view
  }

  func updateNSView(_ nsView: NSView, context: Context) {}
}
