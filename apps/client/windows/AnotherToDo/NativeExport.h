#pragma once

#include "pch.h"

#include <memory>
#include <string>
#include <vector>

#include <shobjidl.h>
#include <wincrypt.h>

#include "NativeMenu.h"
#include "NativeModules.h"

#pragma comment(lib, "Crypt32.lib")

namespace AnotherToDoExportSupport {

inline std::vector<BYTE> Decode(std::string const &base64) {
  DWORD size = 0;
  auto length = static_cast<DWORD>(base64.size());
  winrt::check_bool(
      CryptStringToBinaryA(base64.c_str(), length, CRYPT_STRING_BASE64, nullptr, &size, nullptr, nullptr));
  std::vector<BYTE> bytes(size);
  winrt::check_bool(
      CryptStringToBinaryA(base64.c_str(), length, CRYPT_STRING_BASE64, bytes.data(), &size, nullptr, nullptr));
  bytes.resize(size);
  return bytes;
}

inline void Write(wchar_t const *path, std::vector<BYTE> const &bytes) {
  winrt::file_handle file{CreateFileW(path, GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr)};
  winrt::check_bool(static_cast<bool>(file));
  DWORD written = 0;
  winrt::check_bool(WriteFile(file.get(), bytes.data(), static_cast<DWORD>(bytes.size()), &written, nullptr));
}

inline bool Save(std::wstring const &name, std::vector<BYTE> const &bytes) {
  winrt::com_ptr<IFileSaveDialog> dialog;
  winrt::check_hresult(
      CoCreateInstance(CLSID_FileSaveDialog, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(dialog.put())));
  auto dot = name.find_last_of(L'.');
  std::wstring extension = dot == std::wstring::npos ? std::wstring() : name.substr(dot + 1);
  std::wstring pattern = L"*." + extension;
  COMDLG_FILTERSPEC filter{pattern.c_str(), pattern.c_str()};
  winrt::check_hresult(dialog->SetFileTypes(1, &filter));
  winrt::check_hresult(dialog->SetDefaultExtension(extension.c_str()));
  winrt::check_hresult(dialog->SetFileName(name.c_str()));
  HRESULT shown = dialog->Show(GetForegroundWindow());
  if (shown == HRESULT_FROM_WIN32(ERROR_CANCELLED)) {
    return false;
  }
  winrt::check_hresult(shown);
  winrt::com_ptr<IShellItem> item;
  winrt::check_hresult(dialog->GetResult(item.put()));
  PWSTR path = nullptr;
  winrt::check_hresult(item->GetDisplayName(SIGDN_FILESYSPATH, &path));
  std::wstring chosen{path};
  CoTaskMemFree(path);
  Write(chosen.c_str(), bytes);
  return true;
}

struct PendingSave {
  std::string name;
  std::string contents;
  winrt::Microsoft::ReactNative::ReactPromise<bool> promise;
};

}

REACT_MODULE(AnotherToDoExport, L"AnotherToDoExport")
struct AnotherToDoExport {
  REACT_INIT(Initialize)
  void Initialize(winrt::Microsoft::ReactNative::ReactContext const &context) noexcept {
    m_context = context;
  }

  REACT_METHOD(Save, L"save")
  void Save(
      std::string &&name,
      std::string &&,
      std::string &&contents,
      winrt::Microsoft::ReactNative::ReactPromise<bool> &&promise) noexcept {
    auto pending = std::make_shared<AnotherToDoExportSupport::PendingSave>(
        AnotherToDoExportSupport::PendingSave{std::move(name), std::move(contents), std::move(promise)});
    m_context.UIDispatcher().Post([pending]() {
      try {
        pending->promise.Resolve(AnotherToDoExportSupport::Save(
            AnotherToDoMenuSupport::Widen(pending->name), AnotherToDoExportSupport::Decode(pending->contents)));
      } catch (winrt::hresult_error const &error) {
        pending->promise.Reject(winrt::to_string(error.message()).c_str());
      }
    });
  }

 private:
  winrt::Microsoft::ReactNative::ReactContext m_context;
};
