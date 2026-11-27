Pod::Spec.new do |s|
  s.name = "AnotherToDoSystem"
  s.version = "1.0.0"
  s.summary = "Sounds, file choosing, image sampling and settings for Another To Do"
  s.homepage = "https://another-todo.oliverhardman.dev"
  s.license = "MIT"
  s.authors = { "Another To Do" => "https://another-todo.oliverhardman.dev" }
  s.platforms = { :osx => "14.0" }
  s.source = { :path => "." }
  s.source_files = "*.{h,m,mm}"
  s.requires_arc = true
  s.frameworks = "AppKit", "ImageIO", "UniformTypeIdentifiers"
  s.pod_target_xcconfig = { "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited) OS_OBJECT_USE_OBJC=1" }
  s.dependency "React-Core"
end
