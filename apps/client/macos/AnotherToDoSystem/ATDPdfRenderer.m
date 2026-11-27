#import "ATDPdfRenderer.h"

#import <AppKit/AppKit.h>
#import <WebKit/WebKit.h>

static const CGFloat ATDPageMargin = 36;

@interface ATDPdfRenderer () <WKNavigationDelegate>
@property(nonatomic, strong) WKWebView *webView;
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, strong) NSPrintInfo *printInfo;
@property(nonatomic, strong) NSURL *target;
@property(nonatomic, copy) void (^completion)(NSData *, NSError *);
@end

@implementation ATDPdfRenderer

+ (NSMutableSet<ATDPdfRenderer *> *)active
{
  static NSMutableSet<ATDPdfRenderer *> *active;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    active = [NSMutableSet set];
  });
  return active;
}

+ (void)renderHTML:(NSString *)html completion:(void (^)(NSData *, NSError *))completion
{
  ATDPdfRenderer *renderer = [[ATDPdfRenderer alloc] initWithCompletion:completion];
  [[self active] addObject:renderer];
  [renderer.webView loadHTMLString:html baseURL:nil];
}

- (instancetype)initWithCompletion:(void (^)(NSData *, NSError *))completion
{
  if ((self = [super init])) {
    _completion = [completion copy];
    NSString *file = [[NSUUID UUID].UUIDString stringByAppendingPathExtension:@"pdf"];
    _target = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:file]];
    _printInfo = [[NSPrintInfo sharedPrintInfo] copy];
    _printInfo.jobDisposition = NSPrintSaveJob;
    _printInfo.dictionary[NSPrintJobSavingURL] = _target;
    _printInfo.topMargin = ATDPageMargin;
    _printInfo.bottomMargin = ATDPageMargin;
    _printInfo.leftMargin = ATDPageMargin;
    _printInfo.rightMargin = ATDPageMargin;
    _printInfo.horizontallyCentered = NO;
    _printInfo.verticallyCentered = NO;
    _printInfo.horizontalPagination = NSPrintingPaginationModeFit;
    _printInfo.verticalPagination = NSPrintingPaginationModeAutomatic;
    NSRect frame = NSMakeRect(0, 0, _printInfo.paperSize.width - 2 * ATDPageMargin,
                              _printInfo.paperSize.height - 2 * ATDPageMargin);
    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.defaultWebpagePreferences.allowsContentJavaScript = NO;
    _webView = [[WKWebView alloc] initWithFrame:frame configuration:configuration];
    _webView.navigationDelegate = self;
    _window = [[NSWindow alloc] initWithContentRect:frame
                                          styleMask:NSWindowStyleMaskBorderless
                                            backing:NSBackingStoreBuffered
                                              defer:YES];
    _window.releasedWhenClosed = NO;
    _window.contentView = _webView;
  }
  return self;
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation
{
  NSPrintOperation *operation = [webView printOperationWithPrintInfo:self.printInfo];
  operation.showsPrintPanel = NO;
  operation.showsProgressPanel = NO;
  operation.view.frame = webView.bounds;
  [operation runOperationModalForWindow:self.window
                               delegate:self
                         didRunSelector:@selector(printOperationDidRun:success:contextInfo:)
                            contextInfo:NULL];
}

- (void)webView:(WKWebView *)webView didFailNavigation:(WKNavigation *)navigation withError:(NSError *)error
{
  [self finishWith:nil error:error];
}

- (void)webView:(WKWebView *)webView
    didFailProvisionalNavigation:(WKNavigation *)navigation
                       withError:(NSError *)error
{
  [self finishWith:nil error:error];
}

- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView
{
  [self finishWith:nil error:nil];
}

- (void)printOperationDidRun:(NSPrintOperation *)operation success:(BOOL)success contextInfo:(void *)contextInfo
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSError *error = nil;
    NSData *data = success ? [NSData dataWithContentsOfURL:self.target options:0 error:&error] : nil;
    [self finishWith:data error:error];
  });
}

- (void)finishWith:(NSData *)data error:(NSError *)error
{
  void (^completion)(NSData *, NSError *) = self.completion;
  if (completion == nil) {
    return;
  }
  self.completion = nil;
  [[NSFileManager defaultManager] removeItemAtURL:self.target error:nil];
  completion(data, error);
  [[ATDPdfRenderer active] removeObject:self];
}

@end
