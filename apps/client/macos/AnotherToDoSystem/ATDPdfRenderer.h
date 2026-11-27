#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ATDPdfRenderer : NSObject

+ (void)renderHTML:(NSString *)html completion:(void (^)(NSData *_Nullable data, NSError *_Nullable error))completion;

@end

NS_ASSUME_NONNULL_END
