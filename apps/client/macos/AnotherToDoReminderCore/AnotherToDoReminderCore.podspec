Pod::Spec.new do |s|
  s.name = "AnotherToDoReminderCore"
  s.version = "1.0.0"
  s.summary = "Local notifications for Another To Do reminders"
  s.homepage = "https://another-todo.oliverhardman.dev"
  s.license = "MIT"
  s.authors = { "Another To Do" => "https://another-todo.oliverhardman.dev" }
  s.platforms = { :osx => "14.0" }
  s.source = { :path => "." }
  s.source_files = "*.swift"
  s.swift_version = "5.0"
  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }
  s.frameworks = "UserNotifications"
end
