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
    NSMenuItem *entry = [[NSMenuItem alloc] initWithTitle:item[@"label"] ?: @"" action:nil keyEquivalent:@""];
    entry.enabled = ![item[@"disabled"] boolValue];
    entry.state = [item[@"checked"] boolValue] ? NSControlStateValueOn : NSControlStateValueOff;
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
    [NSNotificationCenter.defaultCenter addObserver:self
                                           selector:@selector(installMenuBar)
                                               name:NSApplicationDidUpdateNotification
                                             object:nil];
  }
  for (NSMenuItem *item in _menuBarItems) {
    [item.menu removeItem:item];
  }
  _menuBarItems = [NSMutableArray array];
  for (NSDictionary *menu in menus) {
    NSString *title = menu[@"label"] ?: @"";
    NSMenuItem *item = [[NSMenuItem alloc] initWithTitle:title action:nil keyEquivalent:@""];
    item.identifier = [ATDMenuBarPrefix stringByAppendingString:menu[@"key"] ?: title];
    item.submenu = [self buildMenu:menu[@"children"] target:_menuBarTarget];
    item.submenu.title = title;
    [_menuBarItems addObject:item];
  }
  [self installMenuBar];
}

- (void)installMenuBar
{
  NSMenu *bar = NSApp.mainMenu;
  if (bar == nil) {
    return;
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
