import UIKit

final class DocumentSaver: NSObject, UIDocumentPickerDelegate {
  private let folder: URL
  private var completion: ((Bool) -> Void)?

  init(completion: @escaping (Bool) -> Void) {
    self.completion = completion
    folder = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
  }

  func picker(saving data: Data, as name: String) throws -> UIDocumentPickerViewController {
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let file = folder.appendingPathComponent(name)
    try data.write(to: file)
    let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
    picker.delegate = self
    return picker
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    finish(true)
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    finish(false)
  }

  private func finish(_ saved: Bool) {
    try? FileManager.default.removeItem(at: folder)
    completion?(saved)
    completion = nil
  }
}
