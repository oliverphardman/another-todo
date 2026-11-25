#undef OS_OBJECT_USE_OBJC
#define OS_OBJECT_USE_OBJC 1

#import <AppKit/AppKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <React/RCTBridgeModule.h>

@interface AnotherToDoFiles : NSObject <RCTBridgeModule>
@end

@implementation AnotherToDoFiles

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(pick:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  NSOpenPanel *panel = [NSOpenPanel openPanel];
  panel.canChooseFiles = YES;
  panel.canChooseDirectories = NO;
  panel.allowsMultipleSelection = NO;
  void (^finish)(NSModalResponse) = ^(NSModalResponse response) {
    NSURL *url = panel.URL;
    if (response != NSModalResponseOK || url == nil) {
      resolve([NSNull null]);
      return;
    }
    NSNumber *size = nil;
    NSError *error = nil;
    if (![url getResourceValue:&size forKey:NSURLFileSizeKey error:&error]) {
      reject(@"unreadable", @"The file could not be read", error);
      return;
    }
    NSString *contentType = [UTType typeWithFilenameExtension:url.pathExtension].preferredMIMEType;
    resolve(@{
      @"uri" : url.absoluteString,
      @"name" : url.lastPathComponent,
      @"size" : size ?: @0,
      @"contentType" : contentType ?: @"application/octet-stream",
    });
  };
  NSWindow *window = NSApp.keyWindow ?: NSApp.mainWindow;
  if (window == nil) {
    finish([panel runModal]);
  } else {
    [panel beginSheetModalForWindow:window completionHandler:finish];
  }
}

@end
