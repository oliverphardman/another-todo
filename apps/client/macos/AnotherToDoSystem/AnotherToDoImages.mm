#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#import <ImageIO/ImageIO.h>
#import <React/RCTBridgeModule.h>

static const size_t ATDSampleSize = 32;

@interface AnotherToDoImages : NSObject <RCTBridgeModule>
@end

@implementation AnotherToDoImages

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
    queue = dispatch_queue_create("dev.oliverhardman.anothertodo.images", DISPATCH_QUEUE_CONCURRENT);
  });
  return queue;
}

+ (NSString *)averageColorOf:(NSData *)data from:(double)from to:(double)to
{
  CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)data, NULL);
  if (source == NULL) {
    return nil;
  }
  NSDictionary *options = @{
    (__bridge NSString *)kCGImageSourceCreateThumbnailFromImageAlways : @YES,
    (__bridge NSString *)kCGImageSourceCreateThumbnailWithTransform : @YES,
    (__bridge NSString *)kCGImageSourceThumbnailMaxPixelSize : @256,
  };
  CGImageRef image = CGImageSourceCreateThumbnailAtIndex(source, 0, (__bridge CFDictionaryRef)options);
  CFRelease(source);
  if (image == NULL) {
    return nil;
  }
  uint8_t pixels[ATDSampleSize * ATDSampleSize * 4] = {0};
  CGColorSpaceRef space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
  CGContextRef context = CGBitmapContextCreate(pixels, ATDSampleSize, ATDSampleSize, 8, ATDSampleSize * 4, space,
                                               (CGBitmapInfo)kCGImageAlphaPremultipliedLast);
  CGColorSpaceRelease(space);
  if (context == NULL) {
    CGImageRelease(image);
    return nil;
  }
  CGContextDrawImage(context, CGRectMake(0, 0, ATDSampleSize, ATDSampleSize), image);
  CGContextRelease(context);
  CGImageRelease(image);
  size_t first = (size_t)floor(from * ATDSampleSize);
  size_t last = (size_t)ceil(to * ATDSampleSize);
  double totals[3] = {0};
  for (size_t offset = first * ATDSampleSize * 4; offset < last * ATDSampleSize * 4; offset += 4) {
    for (size_t channel = 0; channel < 3; channel += 1) {
      totals[channel] += pixels[offset + channel];
    }
  }
  double count = (double)((last - first) * ATDSampleSize);
  return [NSString stringWithFormat:@"#%02lx%02lx%02lx", lround(totals[0] / count), lround(totals[1] / count),
                                    lround(totals[2] / count)];
}

RCT_EXPORT_METHOD(averageColor:(NSString *)uri
                  from:(double)from
                  to:(double)to
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:uri];
  NSData *data = url == nil ? nil : [NSData dataWithContentsOfURL:url];
  NSString *color = data == nil ? nil : [AnotherToDoImages averageColorOf:data from:from to:to];
  resolve(color == nil ? (id)[NSNull null] : color);
}

@end
