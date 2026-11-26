#undef OS_OBJECT_USE_OBJC
#define OS_OBJECT_USE_OBJC 1

#import <AppKit/AppKit.h>
#import <React/RCTBridgeModule.h>

static NSNotificationName const ATDSettingsModelNotification = @"ATDSettingsModel";
static NSNotificationName const ATDSettingsChangeNotification = @"ATDSettingsChange";

@interface AnotherToDoSettings : NSObject <RCTBridgeModule>
@end

@implementation AnotherToDoSettings {
  NSMutableArray<NSDictionary *> *_changes;
  RCTPromiseResolveBlock _awaitingChange;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (instancetype)init
{
  if ((self = [super init])) {
    _changes = [NSMutableArray array];
    [NSNotificationCenter.defaultCenter addObserver:self
                                           selector:@selector(changed:)
                                               name:ATDSettingsChangeNotification
                                             object:nil];
  }
  return self;
}

- (void)dealloc
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (void)changed:(NSNotification *)notification
{
  NSDictionary *change = notification.userInfo;
  RCTPromiseResolveBlock waiting = _awaitingChange;
  if (waiting != nil) {
    _awaitingChange = nil;
    waiting(change);
    return;
  }
  [_changes addObject:change];
}

RCT_EXPORT_METHOD(show:(NSString *)model)
{
  [NSNotificationCenter.defaultCenter postNotificationName:ATDSettingsModelNotification
                                                    object:nil
                                                  userInfo:@{@"model" : model}];
}

RCT_EXPORT_METHOD(nextChange:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  if (_awaitingChange != nil) {
    _awaitingChange([NSNull null]);
    _awaitingChange = nil;
  }
  NSDictionary *queued = _changes.firstObject;
  if (queued != nil) {
    [_changes removeObjectAtIndex:0];
    resolve(queued);
    return;
  }
  _awaitingChange = [resolve copy];
}

@end
