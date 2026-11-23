#import <React/RCTBridgeModule.h>
#if __has_include(<AnotherToDoReminderCore/AnotherToDoReminderCore-Swift.h>)
#import <AnotherToDoReminderCore/AnotherToDoReminderCore-Swift.h>
#else
#import "AnotherToDoReminderCore-Swift.h"
#endif

@interface AnotherToDoReminders : NSObject <RCTBridgeModule>
@end

@implementation AnotherToDoReminders

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(permission:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [[ATDReminderCenter shared] permissionWithCompletion:^(NSString *state) {
    resolve(state);
  }];
}

RCT_EXPORT_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [[ATDReminderCenter shared] requestPermissionWithCompletion:^(NSString *state) {
    resolve(state);
  }];
}

RCT_EXPORT_METHOD(schedule:(NSString *)identifier
                  title:(NSString *)title
                  at:(double)milliseconds
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [[ATDReminderCenter shared] scheduleWithIdentifier:identifier
                                               title:title
                                                  at:milliseconds
                                          completion:^(BOOL scheduled) {
    if (scheduled) {
      resolve(nil);
    } else {
      reject(@"schedule_failed", @"The reminder could not be scheduled", nil);
    }
  }];
}

RCT_EXPORT_METHOD(cancel:(NSString *)identifier resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [[ATDReminderCenter shared] cancelWithIdentifier:identifier];
  resolve(nil);
}

RCT_EXPORT_METHOD(clear:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [[ATDReminderCenter shared] clear];
  resolve(nil);
}

@end
