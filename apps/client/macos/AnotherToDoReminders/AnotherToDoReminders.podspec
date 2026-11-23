Pod::Spec.new do |s|
  s.name = "AnotherToDoReminders"
  s.version = "1.0.0"
  s.summary = "React Native bridge for Another To Do reminder notifications"
  s.homepage = "https://another-todo.oliverhardman.dev"
  s.license = "MIT"
  s.authors = { "Another To Do" => "https://another-todo.oliverhardman.dev" }
  s.platforms = { :osx => "14.0" }
  s.source = { :path => "." }
  s.source_files = "*.{h,m,mm}"
  s.requires_arc = true
  s.dependency "React-Core"
  s.dependency "AnotherToDoReminderCore"
end
