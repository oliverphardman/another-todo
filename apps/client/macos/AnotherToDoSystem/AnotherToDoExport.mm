#undef OS_OBJECT_USE_OBJC
#define OS_OBJECT_USE_OBJC 1

#import <AppKit/AppKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <React/RCTBridgeModule.h>

#import "ATDPdfRenderer.h"

@interface AnotherToDoExport : NSObject <RCTBridgeModule>
@end

@implementation AnotherToDoExport

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(save:(NSString *)name
                  contentType:(NSString *)contentType
                  contents:(NSString *)base64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 options:0];
  if (data == nil) {
    reject(@"unreadable", @"The export could not be read", nil);
    return;
  }
  NSSavePanel *panel = [NSSavePanel savePanel];
  UTType *type = [UTType typeWithFilenameExtension:name.pathExtension];
  if (type != nil) {
    panel.allowedContentTypes = @[ type ];
  }
  panel.nameFieldStringValue = name;
  panel.canCreateDirectories = YES;
  panel.extensionHidden = NO;
  void (^finish)(NSModalResponse) = ^(NSModalResponse response) {
    NSURL *url = panel.URL;
    if (response != NSModalResponseOK || url == nil) {
      resolve(@NO);
      return;
    }
    NSError *error = nil;
    if (![data writeToURL:url options:NSDataWritingAtomic error:&error]) {
      reject(@"unwritable", @"The file could not be saved", error);
      return;
    }
    resolve(@YES);
  };
  NSWindow *window = NSApp.keyWindow ?: NSApp.mainWindow;
  if (window == nil) {
    finish([panel runModal]);
  } else {
    [panel beginSheetModalForWindow:window completionHandler:finish];
  }
}

RCT_EXPORT_METHOD(renderPdf:(NSString *)html
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [ATDPdfRenderer renderHTML:html
                  completion:^(NSData *data, NSError *error) {
                    if (data == nil) {
                      reject(@"unprintable", @"The PDF could not be created", error);
                      return;
                    }
                    resolve([data base64EncodedStringWithOptions:0]);
                  }];
}

@end
