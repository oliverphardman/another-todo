#undef OS_OBJECT_USE_OBJC
#define OS_OBJECT_USE_OBJC 1

#import <AppKit/AppKit.h>
#import <React/RCTBridgeModule.h>

@interface ATDMenuTarget : NSObject
@property (nonatomic, copy) NSString *selectedKey;
@property (nonatomic, copy) void (^onPick)(NSString *key);
- (void)picked:(NSMenuItem *)sender;
@end

@implementation ATDMenuTarget
- (void)picked:(NSMenuItem *)sender
{
  self.selectedKey = sender.representedObject;
  if (self.onPick != nil) {
    self.onPick(sender.representedObject);
  }
}
@end

static NSString *const ATDMenuBarPrefix = @"atd-menu-bar-";

@interface AnotherToDoMenu : NSObject <RCTBridgeModule>
@end

@implementation AnotherToDoMenu {
  NSMutableArray<NSMenuItem *> *_menuBarItems;
  NSMutableArray<NSString *> *_selections;
  RCTPromiseResolveBlock _awaitingSelection;
  ATDMenuTarget *_menuBarTarget;
  NSMutableArray<NSMenuItem *> *_appItems;
  NSDictionary *_about;
  BOOL _watchingMenuBar;
}

- (void)dealloc
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (void)illustrate:(NSMenuItem *)entry markup:(NSString *)markup
{
  NSImage *icon = [[NSImage alloc] initWithData:[markup dataUsingEncoding:NSUTF8StringEncoding]];
  [icon setTemplate:YES];
  entry.image = icon;
  if ([entry respondsToSelector:NSSelectorFromString(@"setPreferredImageVisibility:")]) {
    [entry setValue:@1 forKey:@"preferredImageVisibility"];
  }
}

- (NSMenu *)buildMenu:(NSArray *)items target:(ATDMenuTarget *)target
{
  NSMenu *menu = [[NSMenu alloc] init];
  menu.autoenablesItems = NO;
  for (NSDictionary *item in items) {
    NSString *kind = item[@"kind"];
    if ([kind isEqualToString:@"separator"]) {
      [menu addItem:[NSMenuItem separatorItem]];
      continue;
    }
    NSMenuItem *entry = [[NSMenuItem alloc] initWithTitle:item[@"label"] ?: @""
                                                   action:nil
                                            keyEquivalent:item[@"shortcut"] ?: @""];
    entry.enabled = ![item[@"disabled"] boolValue];
    entry.state = [item[@"checked"] boolValue] ? NSControlStateValueOn : NSControlStateValueOff;
    if (item[@"icon"] != nil) {
      [self illustrate:entry markup:item[@"icon"]];
    }
    if ([kind isEqualToString:@"submenu"] && item[@"children"] != nil) {
      entry.submenu = [self buildMenu:item[@"children"] target:target];
    } else {
      entry.target = target;
      entry.action = @selector(picked:);
      entry.representedObject = item[@"key"];
    }
    [menu addItem:entry];
  }
  return menu;
}

RCT_EXPORT_METHOD(show:(NSArray *)items
                  x:(double)x
                  y:(double)y
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSWindow *window = NSApp.keyWindow ?: NSApp.mainWindow;
  if (window == nil) {
    resolve([NSNull null]);
    return;
  }
  NSView *view = window.contentView;
  ATDMenuTarget *target = [[ATDMenuTarget alloc] init];
  NSMenu *menu = [self buildMenu:items target:target];
  NSPoint pointer = [view convertPoint:window.mouseLocationOutsideOfEventStream fromView:nil];
  [menu popUpMenuPositioningItem:nil atLocation:pointer inView:view];
  resolve(target.selectedKey ?: [NSNull null]);
}

RCT_EXPORT_METHOD(setMenuBar:(NSArray *)menus)
{
  if (_menuBarTarget == nil) {
    _menuBarTarget = [[ATDMenuTarget alloc] init];
    __weak AnotherToDoMenu *weakSelf = self;
    _menuBarTarget.onPick = ^(NSString *key) {
      [weakSelf selectFromMenuBar:key];
    };
  }
  for (NSMenuItem *item in [_menuBarItems arrayByAddingObjectsFromArray:_appItems ?: @[]]) {
    [item.menu removeItem:item];
  }
  _menuBarItems = [NSMutableArray array];
  _appItems = [NSMutableArray array];
  for (NSDictionary *menu in menus) {
    if ([menu[@"key"] isEqualToString:@"app"]) {
      NSMenu *entries = [self buildMenu:menu[@"children"] target:_menuBarTarget];
      for (NSMenuItem *entry in entries.itemArray.copy) {
        [entries removeItem:entry];
        [_appItems addObject:entry];
      }
      if (_appItems.count > 0) {
        [_appItems addObject:[NSMenuItem separatorItem]];
      }
      continue;
    }
    NSString *title = menu[@"label"] ?: @"";
    NSMenuItem *item = [[NSMenuItem alloc] initWithTitle:title action:nil keyEquivalent:@""];
    item.identifier = [ATDMenuBarPrefix stringByAppendingString:menu[@"key"] ?: title];
    item.submenu = [self buildMenu:menu[@"children"] target:_menuBarTarget];
    item.submenu.title = title;
    [_menuBarItems addObject:item];
  }
  [self watchMenuBar];
}

RCT_EXPORT_METHOD(setAbout:(NSDictionary *)details)
{
  _about = [details copy];
  [self watchMenuBar];
}

- (void)watchMenuBar
{
  if (!_watchingMenuBar) {
    _watchingMenuBar = YES;
    [NSNotificationCenter.defaultCenter addObserver:self
                                           selector:@selector(installMenuBar)
                                               name:NSApplicationDidUpdateNotification
                                             object:nil];
  }
  [self installMenuBar];
}

- (void)showAbout:(NSMenuItem *)sender
{
  NSMutableAttributedString *credits = [[NSMutableAttributedString alloc] init];
  NSString *server = [_about[@"serverUrl"] isKindOfClass:NSString.class] ? _about[@"serverUrl"] : nil;
  if (server != nil) {
    [self append:credits label:_about[@"serverLabel"] link:server];
  }
  [self append:credits label:_about[@"sourceLabel"] link:_about[@"sourceUrl"]];
  [credits appendAttributedString:[[NSAttributedString alloc]
                                      initWithString:[@"\n" stringByAppendingString:_about[@"license"] ?: @""]
                                          attributes:[self creditAttributes]]];
  [NSApp activateIgnoringOtherApps:YES];
  [NSApp orderFrontStandardAboutPanelWithOptions:@{NSAboutPanelOptionCredits : credits}];
}

- (NSDictionary<NSAttributedStringKey, id> *)creditAttributes
{
  return @{
    NSFontAttributeName : [NSFont systemFontOfSize:NSFont.smallSystemFontSize],
    NSForegroundColorAttributeName : NSColor.labelColor,
  };
}

- (void)append:(NSMutableAttributedString *)credits label:(NSString *)label link:(NSString *)link
{
  NSString *heading = [NSString stringWithFormat:@"%@: ", label ?: @""];
  [credits appendAttributedString:[[NSAttributedString alloc] initWithString:heading attributes:[self creditAttributes]]];
  NSMutableDictionary *attributes = [[self creditAttributes] mutableCopy];
  NSURL *url = [NSURL URLWithString:link ?: @""];
  if (url != nil) {
    attributes[NSLinkAttributeName] = url;
  }
  [credits appendAttributedString:[[NSAttributedString alloc] initWithString:link ?: @"" attributes:attributes]];
  [credits appendAttributedString:[[NSAttributedString alloc] initWithString:@"\n" attributes:[self creditAttributes]]];
}

- (void)installMenuBar
{
  NSMenu *bar = NSApp.mainMenu;
  if (bar == nil) {
    return;
  }
  NSMenu *application = bar.numberOfItems > 0 ? [bar itemAtIndex:0].submenu : nil;
  if (_about != nil && application.numberOfItems > 0) {
    NSMenuItem *about = [application itemAtIndex:0];
    if (about.target != self) {
      about.target = self;
      about.action = @selector(showAbout:);
    }
  }
  if (application.numberOfItems > 0 && _appItems.firstObject.menu != application) {
    for (NSMenuItem *item in _appItems) {
      [item.menu removeItem:item];
    }
    NSInteger afterAbout = MIN(2, application.numberOfItems);
    for (NSMenuItem *item in _appItems) {
      [application insertItem:item atIndex:afterAbout++];
    }
  }
  for (NSMenuItem *item in _menuBarItems) {
    if (item.menu == bar) {
      continue;
    }
    [item.menu removeItem:item];
    NSInteger window = NSApp.windowsMenu == nil ? -1 : [bar indexOfItemWithSubmenu:NSApp.windowsMenu];
    [bar insertItem:item atIndex:window < 0 ? bar.numberOfItems : window];
  }
}

- (void)selectFromMenuBar:(NSString *)key
{
  RCTPromiseResolveBlock waiting = _awaitingSelection;
  if (waiting != nil) {
    _awaitingSelection = nil;
    waiting(key);
    return;
  }
  if (_selections == nil) {
    _selections = [NSMutableArray array];
  }
  [_selections addObject:key];
}

RCT_EXPORT_METHOD(nextMenuBarSelection:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  if (_awaitingSelection != nil) {
    _awaitingSelection([NSNull null]);
    _awaitingSelection = nil;
  }
  NSString *queued = _selections.firstObject;
  if (queued != nil) {
    [_selections removeObjectAtIndex:0];
    resolve(queued);
    return;
  }
  _awaitingSelection = [resolve copy];
}

@end
