#undef OS_OBJECT_USE_OBJC
#define OS_OBJECT_USE_OBJC 1

#import <AppKit/AppKit.h>
#import <React/RCTBridgeModule.h>

@interface ATDMenuTarget : NSObject
@property (nonatomic, copy) NSString *selectedKey;
- (void)picked:(NSMenuItem *)sender;
@end

@implementation ATDMenuTarget
- (void)picked:(NSMenuItem *)sender
{
  self.selectedKey = sender.representedObject;
}
@end

@interface AnotherToDoMenu : NSObject <RCTBridgeModule>
@end

@implementation AnotherToDoMenu

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
  CGFloat top = view.isFlipped ? y : view.bounds.size.height - y;
  [menu popUpMenuPositioningItem:nil atLocation:NSMakePoint(x, top) inView:view];
  resolve(target.selectedKey ?: [NSNull null]);
}

@end
