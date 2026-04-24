import EventKit
import Foundation

private let helperVersion = 1

private func usage() {
  let msg = """
    Usage:
      eventkit-helper doctor
      eventkit-helper list-calendars
      eventkit-helper list-events <calendarIdentifier> <startISO8601> <endISO8601>
      eventkit-helper create-event   (JSON on stdin: calendarId, summary, start, end, location?, description?)
      eventkit-helper update-event   (JSON on stdin: calendarId, eventId, patch object)
      eventkit-helper delete-event <calendarIdentifier> <eventIdentifier>
    """
  FileHandle.standardError.write(Data(msg.utf8))
}

private func writeJson<T: Encodable>(_ value: T) throws {
  let enc = JSONEncoder()
  enc.outputFormatting = [.sortedKeys]
  let data = try enc.encode(value)
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data([10]))
}

private struct DoctorResponse: Codable {
  let ok: Bool
  let platform: String
  let calendarAccess: String
  let helperVersion: Int
}

private struct CalendarRow: Codable {
  let calendarIdentifier: String
  let title: String
  let sourceTitle: String
  let allowsContentModification: Bool
}

private struct ListCalendarsResponse: Codable {
  let calendars: [CalendarRow]
}

private struct ListEventsResponse: Codable {
  let events: [EventRow]
}

private struct EventRow: Codable {
  let id: String
  let summary: String
  let start: String
  let end: String
  let location: String?
  let description: String?
  let service: String
  let calendarId: String
}

private struct CreateEventResponse: Codable {
  let id: String
  let summary: String
  let start: String
  let end: String
  let location: String?
  let description: String?
  let service: String
  let calendarId: String
  let attendeesOmitted: Bool?
}

private func requestCalendarAccess(_ store: EKEventStore) -> Bool {
  let sem = DispatchSemaphore(value: 0)
  var granted = false
  store.requestAccess(to: .event) { ok, _ in
    granted = ok
    sem.signal()
  }
  sem.wait()
  return granted
}

private func findCalendar(store: EKEventStore, calendarIdentifier: String) -> EKCalendar? {
  for source in store.sources {
    for cal in source.calendars(for: .event) {
      if cal.calendarIdentifier == calendarIdentifier {
        return cal
      }
    }
  }
  return nil
}

private func isoFormatter() -> ISO8601DateFormatter {
  let f = ISO8601DateFormatter()
  f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return f
}

private func isoFormatterNoFrac() -> ISO8601DateFormatter {
  let f = ISO8601DateFormatter()
  f.formatOptions = [.withInternetDateTime]
  return f
}

private func parseDate(_ s: String) -> Date? {
  if let d = isoFormatter().date(from: s) { return d }
  return isoFormatterNoFrac().date(from: s)
}

private func formatDate(_ d: Date) -> String {
  isoFormatter().string(from: d)
}

private func doctor() throws {
  #if os(macOS)
    let store = EKEventStore()
    let granted = requestCalendarAccess(store)
    let status = granted ? "authorized" : "denied"
    try writeJson(
      DoctorResponse(ok: true, platform: "darwin", calendarAccess: status, helperVersion: helperVersion))
  #else
    try writeJson(DoctorResponse(ok: false, platform: "unsupported", calendarAccess: "n/a", helperVersion: helperVersion))
  #endif
}

private func listCalendars() throws {
  #if os(macOS)
    let store = EKEventStore()
    guard requestCalendarAccess(store) else {
      try writeJson(ListCalendarsResponse(calendars: []))
      return
    }
    var rows: [CalendarRow] = []
    for source in store.sources {
      for cal in source.calendars(for: .event) {
        rows.append(
          CalendarRow(
            calendarIdentifier: cal.calendarIdentifier,
            title: cal.title,
            sourceTitle: source.title,
            allowsContentModification: cal.allowsContentModifications
          ))
      }
    }
    rows.sort { $0.sourceTitle.localizedCaseInsensitiveCompare($1.sourceTitle) == .orderedAscending }
    try writeJson(ListCalendarsResponse(calendars: rows))
  #else
    try writeJson(ListCalendarsResponse(calendars: []))
  #endif
}

private func listEvents(args: [String]) throws {
  #if os(macOS)
    guard args.count >= 5 else { usage(); exit(2) }
    let calId = args[2]
    guard let start = parseDate(args[3]), let end = parseDate(args[4]) else {
      FileHandle.standardError.write(Data("Invalid date range\n".utf8))
      exit(1)
    }
    let store = EKEventStore()
    guard requestCalendarAccess(store) else {
      try writeJson(ListEventsResponse(events: []))
      return
    }
    guard let calendar = findCalendar(store: store, calendarIdentifier: calId) else {
      FileHandle.standardError.write(Data("Calendar not found\n".utf8))
      exit(1)
    }
    let pred = store.predicateForEvents(withStart: start, end: end, calendars: [calendar])
    let ekEvents = store.events(matching: pred)
    let out: [EventRow] = ekEvents.map { ev in
      let s = formatDate(ev.startDate)
      let e = formatDate(ev.endDate)
      return EventRow(
        id: ev.eventIdentifier,
        summary: ev.title,
        start: s,
        end: e,
        location: ev.location,
        description: ev.notes,
        service: "macos",
        calendarId: calId
      )
    }
    try writeJson(ListEventsResponse(events: out))
  #else
    try writeJson(ListEventsResponse(events: []))
  #endif
}

private func readStdinData() -> Data {
  FileHandle.standardInput.readDataToEndOfFile()
}

private func createEvent() throws {
  #if os(macOS)
    let data = readStdinData()
    guard let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      let calendarId = obj["calendarId"] as? String,
      let summary = obj["summary"] as? String,
      let startStr = obj["start"] as? String,
      let endStr = obj["end"] as? String,
      let start = parseDate(startStr),
      let end = parseDate(endStr)
    else {
      FileHandle.standardError.write(Data("Invalid JSON for create-event\n".utf8))
      exit(1)
    }
    let store = EKEventStore()
    guard requestCalendarAccess(store) else {
      FileHandle.standardError.write(Data("Calendar access denied\n".utf8))
      exit(1)
    }
    guard let calendar = findCalendar(store: store, calendarIdentifier: calendarId) else {
      FileHandle.standardError.write(Data("Calendar not found\n".utf8))
      exit(1)
    }
    let event = EKEvent(eventStore: store)
    event.calendar = calendar
    event.title = summary
    event.startDate = start
    event.endDate = end
    event.location = obj["location"] as? String
    event.notes = obj["description"] as? String
    let attendees = obj["attendees"] as? [String]
    let omitted = attendees != nil && !(attendees!.isEmpty)
    // EventKit: programmatic attendees are limited; omit for now if provided
    try store.save(event, span: .thisEvent)
    let row = CreateEventResponse(
      id: event.eventIdentifier,
      summary: summary,
      start: formatDate(start),
      end: formatDate(end),
      location: event.location,
      description: event.notes,
      service: "macos",
      calendarId: calendarId,
      attendeesOmitted: omitted ? true : nil
    )
    try writeJson(row)
  #endif
}

private func updateEvent() throws {
  #if os(macOS)
    let data = readStdinData()
    guard let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      let calendarId = obj["calendarId"] as? String,
      let eventId = obj["eventId"] as? String,
      let patch = obj["patch"] as? [String: Any]
    else {
      FileHandle.standardError.write(Data("Invalid JSON for update-event\n".utf8))
      exit(1)
    }
    let store = EKEventStore()
    guard requestCalendarAccess(store) else {
      FileHandle.standardError.write(Data("Calendar access denied\n".utf8))
      exit(1)
    }
    guard let calendar = findCalendar(store: store, calendarIdentifier: calendarId) else {
      FileHandle.standardError.write(Data("Calendar not found\n".utf8))
      exit(1)
    }
    guard let event = store.event(withIdentifier: eventId) else {
      FileHandle.standardError.write(Data("Event not found\n".utf8))
      exit(1)
    }
    if event.calendar.calendarIdentifier != calendar.calendarIdentifier {
      FileHandle.standardError.write(Data("Event calendar mismatch\n".utf8))
      exit(1)
    }
    if let s = patch["summary"] as? String { event.title = s }
    if let s = patch["start"] as? String, let d = parseDate(s) { event.startDate = d }
    if let s = patch["end"] as? String, let d = parseDate(s) { event.endDate = d }
    if patch.keys.contains("location") { event.location = patch["location"] as? String }
    if patch.keys.contains("description") { event.notes = patch["description"] as? String }
    try store.save(event, span: .thisEvent)
    let row = CreateEventResponse(
      id: event.eventIdentifier,
      summary: event.title,
      start: formatDate(event.startDate),
      end: formatDate(event.endDate),
      location: event.location,
      description: event.notes,
      service: "macos",
      calendarId: calendarId,
      attendeesOmitted: nil
    )
    try writeJson(row)
  #endif
}

private func deleteEvent(args: [String]) throws {
  #if os(macOS)
    guard args.count >= 4 else { usage(); exit(2) }
    let calId = args[2]
    let eventId = args[3]
    let store = EKEventStore()
    guard requestCalendarAccess(store) else {
      FileHandle.standardError.write(Data("Calendar access denied\n".utf8))
      exit(1)
    }
    guard let calendar = findCalendar(store: store, calendarIdentifier: calId) else {
      FileHandle.standardError.write(Data("Calendar not found\n".utf8))
      exit(1)
    }
    guard let event = store.event(withIdentifier: eventId) else {
      FileHandle.standardError.write(Data("Event not found\n".utf8))
      exit(1)
    }
    if event.calendar.calendarIdentifier != calendar.calendarIdentifier {
      FileHandle.standardError.write(Data("Event calendar mismatch\n".utf8))
      exit(1)
    }
    try store.remove(event, span: .thisEvent)
  #endif
}

do {
  let args = CommandLine.arguments
  guard args.count >= 2 else {
    usage()
    exit(2)
  }
  switch args[1] {
  case "doctor":
    try doctor()
  case "list-calendars":
    try listCalendars()
  case "list-events":
    try listEvents(args: args)
  case "create-event":
    try createEvent()
  case "update-event":
    try updateEvent()
  case "delete-event":
    try deleteEvent(args: args)
  default:
    usage()
    exit(2)
  }
} catch {
  FileHandle.standardError.write(Data("\(error.localizedDescription)\n".utf8))
  exit(1)
}
