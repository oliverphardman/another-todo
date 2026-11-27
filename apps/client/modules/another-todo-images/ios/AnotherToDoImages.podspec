Pod::Spec.new do |s|
  s.name = "AnotherToDoImages"
  s.version = "1.0.0"
  s.summary = "Image sampling for Another To Do"
  s.homepage = "https://another-todo.oliverhardman.dev"
  s.license = "MIT"
  s.authors = { "Another To Do" => "https://another-todo.oliverhardman.dev" }
  s.platforms = { :ios => "15.1" }
  s.source = { :path => "." }
  s.source_files = "*.swift"
  s.frameworks = "CoreGraphics", "ImageIO"
  s.dependency "ExpoModulesCore"
end
