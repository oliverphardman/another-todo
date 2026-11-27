import ExpoModulesCore
import UIKit

public class AnotherToDoExportModule: Module {
  private var saver: DocumentSaver?

  public func definition() -> ModuleDefinition {
    Name("AnotherToDoExport")

    AsyncFunction("save") { (name: String, _: String, base64: String, promise: Promise) in
      guard
        self.saver == nil,
        let data = Data(base64Encoded: base64),
        let presenter = self.appContext?.utilities?.currentViewController()
      else {
        promise.reject("ERR_EXPORT", "The file could not be saved")
        return
      }
      let saver = DocumentSaver { saved in
        self.saver = nil
        promise.resolve(saved)
      }
      let picker = try saver.picker(saving: data, as: name)
      self.saver = saver
      presenter.present(picker, animated: true)
    }
    .runOnQueue(.main)
  }
}
