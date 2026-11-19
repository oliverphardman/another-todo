Pod::Spec.new do |s|
  s.name = "AnotherToDoMenu"
  s.version = "1.0.0"
  s.summary = "Native context menus for Another To Do"
  s.homepage = "https://another-todo.oliverhardman.dev"
  s.license = "MIT"
  s.authors = { "Another To Do" => "https://another-todo.oliverhardman.dev" }
  s.platforms = { :macos => "14.0" }
  s.source = { :path => "." }
  s.source_files = "*.{h,m}"
  s.dependency "React-Core"
end
