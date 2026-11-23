import Foundation
import UserNotifications

@objc(ATDReminderCenter)
public final class ReminderCenter: NSObject, UNUserNotificationCenterDelegate {
  @objc public static let shared = ReminderCenter()

  private override init() {
    super.init()
    UNUserNotificationCenter.current().delegate = self
  }

  @objc(permissionWithCompletion:)
  public func permission(completion: @escaping (String) -> Void) {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      completion(ReminderCenter.name(of: settings.authorizationStatus))
    }
  }

  @objc(requestPermissionWithCompletion:)
  public func requestPermission(completion: @escaping (String) -> Void) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in
      self.permission(completion: completion)
    }
  }

  @objc(scheduleWithIdentifier:title:at:completion:)
  public func schedule(
    identifier: String,
    title: String,
    at milliseconds: Double,
    completion: @escaping (Bool) -> Void
  ) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.sound = .default
    let date = Date(timeIntervalSince1970: milliseconds / 1000)
    let parts = Calendar.current.dateComponents(
      [.year, .month, .day, .hour, .minute, .second], from: date)
    let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
    let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
    UNUserNotificationCenter.current().add(request) { error in
      completion(error == nil)
    }
  }

  @objc(cancelWithIdentifier:)
  public func cancel(identifier: String) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
  }

  @objc
  public func clear() {
    UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .list, .sound])
  }

  private static func name(of status: UNAuthorizationStatus) -> String {
    switch status {
    case .authorized, .provisional:
      return "granted"
    case .notDetermined:
      return "undetermined"
    default:
      return "denied"
    }
  }
}
