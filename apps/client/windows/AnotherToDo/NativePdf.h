#pragma once

#include "pch.h"

#include <chrono>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include <shlwapi.h>
#include <wincrypt.h>

#include <winrt/Microsoft.Web.WebView2.Core.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Storage.Streams.h>

#include "NativeModules.h"

#pragma comment(lib, "Crypt32.lib")
#pragma comment(lib, "Shlwapi.lib")

namespace AnotherToDoPdfSupport {

struct PendingPdf {
  std::string html;
  winrt::Microsoft::ReactNative::ReactPromise<std::string> promise;
};

inline std::wstring TemporaryFolder() {
  wchar_t path[MAX_PATH + 1];
  DWORD length = GetTempPathW(MAX_PATH + 1, path);
  winrt::check_bool(length > 0 && length <= MAX_PATH);
  return std::wstring(path, length);
}

inline std::wstring TemporaryPage() {
  auto id = winrt::to_hstring(winrt::Windows::Foundation::GuidHelper::CreateNewGuid());
  return TemporaryFolder() + L"AnotherToDo-" + std::wstring(id) + L".html";
}

inline void WritePage(std::wstring const &path, std::string const &html) {
  winrt::file_handle file{
      CreateFileW(path.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_TEMPORARY, nullptr)};
  winrt::check_bool(static_cast<bool>(file));
  DWORD written = 0;
  winrt::check_bool(WriteFile(file.get(), html.data(), static_cast<DWORD>(html.size()), &written, nullptr));
}

inline winrt::hstring FileUrl(std::wstring const &path) {
  wchar_t url[2084];
  DWORD length = ARRAYSIZE(url);
  winrt::check_hresult(UrlCreateFromPathW(path.c_str(), url, &length, 0));
  return winrt::hstring(url, length);
}

inline std::string Encode(std::vector<std::uint8_t> const &bytes) {
  DWORD flags = CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF;
  auto size = static_cast<DWORD>(bytes.size());
  DWORD length = 0;
  winrt::check_bool(CryptBinaryToStringA(bytes.data(), size, flags, nullptr, &length));
  std::string text(length, '\0');
  winrt::check_bool(CryptBinaryToStringA(bytes.data(), size, flags, text.data(), &length));
  text.resize(length);
  return text;
}

inline winrt::fire_and_forget Render(std::shared_ptr<PendingPdf> pending) {
  using namespace winrt::Microsoft::Web::WebView2::Core;
  winrt::apartment_context ui;
  std::wstring page;
  CoreWebView2Controller controller{nullptr};
  winrt::handle loaded;
  auto succeeded = std::make_shared<bool>(false);
  try {
    page = TemporaryPage();
    WritePage(page, pending->html);
    loaded.attach(winrt::check_pointer(CreateEventW(nullptr, TRUE, FALSE, nullptr)));
    auto environment = co_await CoreWebView2Environment::CreateWithOptionsAsync(
        L"", winrt::hstring(TemporaryFolder() + L"AnotherToDo-WebView2"), nullptr);
    controller = co_await environment.CreateCoreWebView2ControllerAsync(
        CoreWebView2ControllerWindowReference::CreateFromWindowHandle(reinterpret_cast<std::uint64_t>(HWND_MESSAGE)));
    auto view = controller.CoreWebView2();
    view.Settings().IsScriptEnabled(false);
    view.NavigationCompleted([succeeded, signal = loaded.get()](auto const &, auto const &arguments) {
      *succeeded = arguments.IsSuccess();
      SetEvent(signal);
    });
    view.Navigate(FileUrl(page));
    bool finished = co_await winrt::resume_on_signal(loaded.get(), std::chrono::seconds(30));
    co_await ui;
    if (!finished || !*succeeded) {
      throw winrt::hresult_error(E_FAIL, L"The page could not be loaded");
    }
    auto stream = co_await view.PrintToPdfStreamAsync(nullptr);
    auto size = static_cast<std::uint32_t>(stream.Size());
    winrt::Windows::Storage::Streams::DataReader reader{stream.GetInputStreamAt(0)};
    co_await reader.LoadAsync(size);
    std::vector<std::uint8_t> bytes(size);
    reader.ReadBytes(bytes);
    pending->promise.Resolve(Encode(bytes));
  } catch (winrt::hresult_error const &error) {
    pending->promise.Reject(winrt::to_string(error.message()).c_str());
  }
  if (controller) {
    controller.Close();
  }
  DeleteFileW(page.c_str());
}

}
