#pragma once

#include "pch.h"

#include <appmodel.h>
#include <combaseapi.h>
#include <memory>
#include <mutex>
#include <string>
#include <thread>

#include <winrt/Microsoft.Windows.AppLifecycle.h>
#include <winrt/Windows.ApplicationModel.Activation.h>

#include "NativeModules.h"

namespace AnotherToDoLinks {

namespace Lifecycle = winrt::Microsoft::Windows::AppLifecycle;

inline bool IsUnpackaged() noexcept {
  UINT32 length = 0;
  return GetCurrentPackageFullName(&length, nullptr) == APPMODEL_ERROR_NO_PACKAGE;
}

inline void RegisterScheme() {
  if (!IsUnpackaged()) {
    return;
  }
  try {
    Lifecycle::ActivationRegistrationManager::RegisterForProtocolActivation(
        L"anothertodo", L"", L"Another To Do", L"");
  } catch (winrt::hresult_error const &error) {
    OutputDebugStringW(error.message().c_str());
  }
}

inline void Redirect(Lifecycle::AppInstance const &target, Lifecycle::AppActivationArguments const &activation) {
  AllowSetForegroundWindow(target.ProcessId());
  winrt::handle redirected{CreateEventW(nullptr, TRUE, FALSE, nullptr)};
  std::thread([&target, &activation, &redirected]() {
    target.RedirectActivationToAsync(activation).get();
    SetEvent(redirected.get());
  }).detach();
  HANDLE waiting = redirected.get();
  DWORD signalled = 0;
  winrt::check_hresult(CoWaitForMultipleObjects(CWMO_DEFAULT, INFINITE, 1, &waiting, &signalled));
}

class LinkRelay {
 public:
  void Connect(winrt::Microsoft::ReactNative::IReactContext const &context) noexcept {
    std::scoped_lock lock{m_mutex};
    m_context = context;
  }

  void Show(HWND window) noexcept {
    std::scoped_lock lock{m_mutex};
    m_window = window;
  }

  void Receive(Lifecycle::AppActivationArguments const &activation) noexcept {
    if (activation.Kind() != Lifecycle::ExtendedActivationKind::Protocol) {
      return;
    }
    auto protocol =
        activation.Data().as<winrt::Windows::ApplicationModel::Activation::IProtocolActivatedEventArgs>();
    std::string url = winrt::to_string(protocol.Uri().RawUri());
    std::scoped_lock lock{m_mutex};
    if (!m_context) {
      return;
    }
    winrt::Microsoft::ReactNative::ReactContext(m_context).EmitJSEvent(
        L"RCTDeviceEventEmitter", L"url", winrt::Microsoft::ReactNative::JSValueObject{{"url", url}});
    if (IsIconic(m_window)) {
      ShowWindow(m_window, SW_RESTORE);
    }
    SetForegroundWindow(m_window);
  }

 private:
  std::mutex m_mutex;
  winrt::Microsoft::ReactNative::IReactContext m_context{nullptr};
  HWND m_window{nullptr};
};

} // namespace AnotherToDoLinks
