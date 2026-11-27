import ExpoModulesCore

public class AnotherToDoImagesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AnotherToDoImages")

    AsyncFunction("averageColor") { (url: URL, from: Double, to: Double) -> String? in
      ImageAverage.color(of: try Data(contentsOf: url), from: from, to: to)
    }
  }
}
