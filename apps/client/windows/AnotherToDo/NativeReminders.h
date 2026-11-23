#pragma once

#include "pch.h"

#include <cstdint>
#include <cstdio>
#include <ctime>
#include <string>

#include <winrt/Windows.Data.Xml.Dom.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.UI.Notifications.h>

#include "NativeModules.h"

namespace AnotherToDoReminderSupport {

inline winrt::hstring ToastId(std::string const &text) {
  std::uint64_t hash = 14695981039346656037ull;
  for (unsigned char character : text) {
    hash ^= character;
    hash *= 1099511628211ull;
  }
  wchar_t buffer[17];
  swprintf_s(buffer, L"%016llx", static_cast<unsigned long long>(hash));
  return winrt::hstring{buffer};
}

inline std::string PermissionName() {
  try {
    auto setting = winrt::Windows::UI::Notifications::ToastNotificationManager::CreateToastNotifier().Setting();
    return setting == winrt::Windows::UI::Notifications::NotificationSetting::Enabled ? "granted" : "denied";
  } catch (...) {
    return "denied";
  }
}

}

REACT_MODULE(AnotherToDoReminders, L"AnotherToDoReminders")
struct AnotherToDoReminders {
  REACT_METHOD(Permission, L"permission")
  void Permission(winrt::Microsoft::ReactNative::ReactPromise<std::string> &&promise) noexcept {
    promise.Resolve(AnotherToDoReminderSupport::PermissionName());
  }

  REACT_METHOD(RequestPermission, L"requestPermission")
  void RequestPermission(winrt::Microsoft::ReactNative::ReactPromise<std::string> &&promise) noexcept {
    promise.Resolve(AnotherToDoReminderSupport::PermissionName());
  }

  REACT_METHOD(Schedule, L"schedule")
  void Schedule(
      std::string &&id,
      std::string &&title,
      double milliseconds,
      winrt::Microsoft::ReactNative::ReactPromise<void> &&promise) noexcept {
    try {
      using namespace winrt::Windows::UI::Notifications;
      auto xml = ToastNotificationManager::GetTemplateContent(ToastTemplateType::ToastText01);
      xml.GetElementsByTagName(L"text").Item(0).InnerText(winrt::to_hstring(title));
      ScheduledToastNotification toast{xml, winrt::clock::from_time_t(static_cast<std::time_t>(milliseconds / 1000))};
      toast.Id(AnotherToDoReminderSupport::ToastId(id));
      ToastNotificationManager::CreateToastNotifier().AddToSchedule(toast);
      promise.Resolve();
    } catch (winrt::hresult_error const &error) {
      promise.Reject(winrt::to_string(error.message()).c_str());
    }
  }

  REACT_METHOD(Cancel, L"cancel")
  void Cancel(std::string &&id, winrt::Microsoft::ReactNative::ReactPromise<void> &&promise) noexcept {
    try {
      using namespace winrt::Windows::UI::Notifications;
      auto notifier = ToastNotificationManager::CreateToastNotifier();
      auto target = AnotherToDoReminderSupport::ToastId(id);
      for (auto const &toast : notifier.GetScheduledToastNotifications()) {
        if (toast.Id() == target) {
          notifier.RemoveFromSchedule(toast);
        }
      }
      promise.Resolve();
    } catch (winrt::hresult_error const &error) {
      promise.Reject(winrt::to_string(error.message()).c_str());
    }
  }

  REACT_METHOD(Clear, L"clear")
  void Clear(winrt::Microsoft::ReactNative::ReactPromise<void> &&promise) noexcept {
    try {
      using namespace winrt::Windows::UI::Notifications;
      auto notifier = ToastNotificationManager::CreateToastNotifier();
      for (auto const &toast : notifier.GetScheduledToastNotifications()) {
        notifier.RemoveFromSchedule(toast);
      }
      promise.Resolve();
    } catch (winrt::hresult_error const &error) {
      promise.Reject(winrt::to_string(error.message()).c_str());
    }
  }
};
