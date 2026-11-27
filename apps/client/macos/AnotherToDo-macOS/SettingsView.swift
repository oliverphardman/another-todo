import AppKit
import SwiftUI

struct SettingsModel: Decodable {
  struct Option: Decodable, Identifiable {
    let value: String
    let label: String
    var id: String { value }
  }

  struct Row: Decodable, Identifiable {
    let kind: String
    let key: String
    let label: String
    let value: String?
    let detail: String?
    let enabled: Bool?
    let height: Double?
    let options: [Option]?
    var id: String { key }
  }

  struct Group: Decodable, Identifiable {
    let key: String
    let title: String
    let rows: [Row]
    var id: String { key }
  }

  let sections: [Group]
}

final class SettingsStore: ObservableObject {
  static let shared = SettingsStore()

  private static let modelNotification = Notification.Name("ATDSettingsModel")
  private static let changeNotification = Notification.Name("ATDSettingsChange")

  @Published private(set) var model = SettingsModel(sections: [])
  private var observer: NSObjectProtocol?

  private init() {
    observer = NotificationCenter.default.addObserver(
      forName: Self.modelNotification, object: nil, queue: .main
    ) { [weak self] notification in
      guard
        let json = notification.userInfo?["model"] as? String,
        let model = try? JSONDecoder().decode(SettingsModel.self, from: Data(json.utf8))
      else { return }
      self?.model = model
    }
  }

  func change(_ key: String, to value: String) {
    NotificationCenter.default.post(
      name: Self.changeNotification, object: nil, userInfo: ["key": key, "value": value]
    )
  }
}

struct SettingsView: View {
  @ObservedObject private var store = SettingsStore.shared

  var body: some View {
    Form {
      ForEach(store.model.sections) { group in
        Section(group.title) {
          ForEach(group.rows) { row in
            SettingsRowView(row: row) { store.change(row.key, to: $0) }
              .disabled(row.enabled == false)
          }
        }
      }
    }
    .formStyle(.grouped)
    .frame(width: 520, height: 640)
  }
}

private struct SettingsRowView: View {
  let row: SettingsModel.Row
  let change: (String) -> Void

  var body: some View {
    switch row.kind {
    case "choice":
      Picker(row.label, selection: Binding(get: { row.value ?? "" }, set: change)) {
        ForEach(row.options ?? []) { option in
          Text(option.label).tag(option.value)
        }
      }
      .pickerStyle(.segmented)
    case "preview":
      SettingsPreview(row: row)
    case "menuPreview":
      SettingsMenuPreview(row: row)
    case "toggle":
      Toggle(isOn: Binding(get: { row.value == "true" }, set: { change(String($0)) })) {
        Text(row.label)
        if let detail = row.detail {
          Text(detail)
        }
      }
      .toggleStyle(.checkbox)
    case "number":
      SettingsNumberField(row: row, change: change)
    case "text":
      TextField(row.label, text: .constant(row.value ?? ""))
    case "action":
      Button(row.label) {
        NSApp.keyWindow?.performClose(nil)
        change("")
      }
    case "button":
      HStack {
        Spacer()
        Button(row.label, role: .destructive) {
          NSApp.keyWindow?.performClose(nil)
          change("")
        }
        Spacer()
      }
    default:
      Text(row.label)
        .foregroundStyle(.secondary)
    }
  }
}

private struct SettingsPreview: View {
  let row: SettingsModel.Row

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: "circle")
        .font(.system(size: 18))
        .foregroundStyle(Color.accentColor)
      VStack(alignment: .leading, spacing: 0) {
        Text(row.label)
        if let detail = row.detail {
          Text(detail)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      Spacer()
      Image(systemName: "star")
        .foregroundStyle(Color.accentColor)
    }
    .padding(.horizontal, 12)
    .frame(height: row.height ?? 52)
    .background(
      RoundedRectangle(cornerRadius: 4).fill(Color(nsColor: .controlBackgroundColor))
    )
    .accessibilityElement(children: .combine)
  }
}

private struct SettingsMenuPreview: View {
  let row: SettingsModel.Row

  private var cozy: Bool { row.value == "cozy" }

  var body: some View {
    HStack(spacing: cozy ? 16 : 12) {
      Image(systemName: "sun.max")
        .font(.system(size: cozy ? 17 : 14, weight: cozy ? .light : .medium))
        .foregroundStyle(Color.secondary)
      Text(row.label)
        .font(.system(size: cozy ? 14 : 13, weight: .semibold))
      Spacer()
    }
    .padding(.horizontal, cozy ? 24 : 16)
    .frame(height: row.height ?? 28)
    .background(Color.primary.opacity(0.1))
    .accessibilityElement(children: .combine)
  }
}

private struct SettingsNumberField: View {
  let row: SettingsModel.Row
  let change: (String) -> Void

  @State private var text = ""
  @FocusState private var focused: Bool

  var body: some View {
    LabeledContent(row.label) {
      HStack {
        TextField(row.label, text: $text)
          .labelsHidden()
          .textFieldStyle(.roundedBorder)
          .multilineTextAlignment(.trailing)
          .frame(width: 64)
          .focused($focused)
          .onSubmit(commit)
        Text(row.detail ?? "")
      }
    }
    .onAppear { text = row.value ?? "" }
    .onChange(of: row.value) { text = row.value ?? "" }
    .onChange(of: focused) {
      if !focused {
        commit()
      }
    }
    .onReceive(NotificationCenter.default.publisher(for: NSWindow.willCloseNotification)) { _ in
      commit()
    }
  }

  private func commit() {
    let entered = text
    guard entered != row.value else { return }
    text = row.value ?? ""
    change(entered)
  }
}
