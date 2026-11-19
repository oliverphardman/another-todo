#pragma once

#include "pch.h"

#include <memory>
#include <string>
#include <unordered_map>

#include "NativeModules.h"

namespace AnotherToDoMenuSupport {

inline std::wstring Widen(std::string const &text) {
  if (text.empty()) {
    return std::wstring();
  }
  int length = MultiByteToWideChar(CP_UTF8, 0, text.c_str(), static_cast<int>(text.size()), nullptr, 0);
  std::wstring wide(static_cast<size_t>(length), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, text.c_str(), static_cast<int>(text.size()), wide.data(), length);
  return wide;
}

inline std::string StringOf(winrt::Microsoft::ReactNative::JSValueObject const &object, char const *name) {
  auto found = object.find(name);
  return found == object.end() ? std::string() : found->second.AsString();
}

inline bool FlagOf(winrt::Microsoft::ReactNative::JSValueObject const &object, char const *name) {
  auto found = object.find(name);
  return found != object.end() && found->second.Type() == winrt::Microsoft::ReactNative::JSValueType::Boolean &&
      found->second.AsBoolean();
}

struct MenuModel {
  std::unordered_map<UINT, std::string> keys;
  UINT next{1};

  HMENU Build(winrt::Microsoft::ReactNative::JSValueArray const &items) {
    HMENU menu = CreatePopupMenu();
    for (auto const &item : items) {
      auto const &object = item.AsObject();
      std::string kind = StringOf(object, "kind");
      if (kind == "separator") {
        AppendMenuW(menu, MF_SEPARATOR, 0, nullptr);
        continue;
      }
      std::wstring label = Widen(StringOf(object, "label"));
      UINT flags = MF_STRING;
      if (FlagOf(object, "disabled")) {
        flags |= MF_GRAYED;
      }
      if (FlagOf(object, "checked")) {
        flags |= MF_CHECKED;
      }
      auto children = object.find("children");
      if (kind == "submenu" && children != object.end()) {
        HMENU submenu = Build(children->second.AsArray());
        AppendMenuW(menu, flags | MF_POPUP, reinterpret_cast<UINT_PTR>(submenu), label.c_str());
        continue;
      }
      UINT id = next++;
      keys[id] = StringOf(object, "key");
      AppendMenuW(menu, flags, id, label.c_str());
    }
    return menu;
  }
};

struct PendingMenu {
  winrt::Microsoft::ReactNative::JSValueArray items;
  double x;
  double y;
  winrt::Microsoft::ReactNative::ReactPromise<winrt::Microsoft::ReactNative::JSValue> promise;
};

}

REACT_MODULE(AnotherToDoMenu, L"AnotherToDoMenu")
struct AnotherToDoMenu {
  REACT_INIT(Initialize)
  void Initialize(winrt::Microsoft::ReactNative::ReactContext const &context) noexcept {
    m_context = context;
  }

  REACT_METHOD(Show, L"show")
  void Show(
      winrt::Microsoft::ReactNative::JSValueArray &&items,
      double x,
      double y,
      winrt::Microsoft::ReactNative::ReactPromise<winrt::Microsoft::ReactNative::JSValue> &&promise) noexcept {
    auto pending = std::make_shared<AnotherToDoMenuSupport::PendingMenu>(
        AnotherToDoMenuSupport::PendingMenu{std::move(items), x, y, std::move(promise)});
    m_context.UIDispatcher().Post([pending]() {
      HWND window = GetForegroundWindow();
      if (window == nullptr) {
        pending->promise.Resolve(winrt::Microsoft::ReactNative::JSValue{nullptr});
        return;
      }
      double scale = static_cast<double>(GetDpiForWindow(window)) / 96.0;
      POINT point{static_cast<LONG>(pending->x * scale), static_cast<LONG>(pending->y * scale)};
      ClientToScreen(window, &point);
      AnotherToDoMenuSupport::MenuModel model;
      HMENU menu = model.Build(pending->items);
      UINT chosen = static_cast<UINT>(TrackPopupMenuEx(
          menu, TPM_RETURNCMD | TPM_NONOTIFY | TPM_LEFTALIGN | TPM_TOPALIGN, point.x, point.y, window, nullptr));
      DestroyMenu(menu);
      auto found = model.keys.find(chosen);
      if (found == model.keys.end()) {
        pending->promise.Resolve(winrt::Microsoft::ReactNative::JSValue{nullptr});
      } else {
        pending->promise.Resolve(winrt::Microsoft::ReactNative::JSValue{found->second});
      }
    });
  }

 private:
  winrt::Microsoft::ReactNative::ReactContext m_context;
};
