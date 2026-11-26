#undef OS_OBJECT_USE_OBJC
#define OS_OBJECT_USE_OBJC 1

#import <AppKit/AppKit.h>
#import <React/RCTBridgeModule.h>

@interface AnotherToDoSound : NSObject <RCTBridgeModule>
@end

@implementation AnotherToDoSound {
  NSSound *_sound;
  NSString *_uri;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  static dispatch_queue_t queue;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    queue = dispatch_queue_create("dev.oliverhardman.anothertodo.sound", DISPATCH_QUEUE_SERIAL);
  });
  return queue;
}

RCT_EXPORT_METHOD(play:(NSString *)uri)
{
  if (![uri isEqualToString:_uri]) {
    NSURL *url = [NSURL URLWithString:uri];
    _sound = url == nil ? nil : [[NSSound alloc] initWithContentsOfURL:url byReference:NO];
    _uri = _sound == nil ? nil : [uri copy];
  }
  [_sound stop];
  [_sound play];
}

@end
