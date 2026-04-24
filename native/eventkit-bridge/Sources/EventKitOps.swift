import EventKit
import Foundation

let bridgeHelperVersion = 1

struct DoctorResponse: Codable {
  let ok: Bool
  let platform: String
  let calendarAccess: String
  let helperVersion: Int
  /// Present when served via eventkit-bridge (not emitted by CLI helper).
  let transport: String?
}

struct CalendarRow: Codable {
  let calendarIdentifier: String
  let title: String
  let sourceTitle: String
  let allowsContentModification: Bool
}

struct ListCalendarsResponse: Codable {
  let calendars: [CalendarRow]
}

struct ListEventsResponse: Codable {
  let events: [EventRow]
}

struct EventRow: Codable {
  let id: String
  let summary: String
  let start: String
  let end: String
  let location: String?
  let description: String?
  let service: String
  let calendarId: String
}

struct CreateEventResponse: Codable {
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

struct DeleteOkResponse: Codable {
  let ok: Bool
}

private func encodeJson<T: Encodable>(_ value: T) throws -> Data {
  let enc = JSONEncoder()
  enc.outputFormatting = [.sortedKeys]
  return try enc.encode(value)
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

enum EventKitOps {
  static func doctor() throws -> Data {
    #if os(macOS)
      let store = EKEventStore()
      let granted = requestCalendarAccess(store)
      let status = granted ? "authorized" : "denied"
      return try encodeJson(
        DoctorResponse(
          ok: true, platform: "darwin", calendarAccess: status, helperVersion: bridgeHelperVersion,
          transport: "bridge"))
    #else
      return try encodeJson(
        DoctorResponse(
          ok: false, platform: "unsupported", calendarAccess: "n/a", helperVersion: bridgeHelperVersion,
          transport: "bridge"))
    #endif
  }

  static func listCalendars() throws -> Data {
    #if os(macOS)
      let store = EKEventStore()
      guard requestCalendarAccess(store) else {
        return try encodeJson(ListCalendarsResponse(calendars: []))
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
      return try encodeJson(ListCalendarsResponse(calendars: rows))
    #else
      return try encodeJson(ListCalendarsResponse(calendars: []))
    #endif
  }

  static func listEvents(calendarId: String, startIso: String, endIso: String) throws -> Data {
    #if os(macOS)
      guard let start = parseDate(startIso), let end = parseDate(endIso) else {
        throw BridgeError.invalidBody("Invalid start/end ISO dates")
      }
      let store = EKEventStore()
      guard requestCalendarAccess(store) else {
        return try encodeJson(ListEventsResponse(events: []))
      }
      guard let calendar = findCalendar(store: store, calendarIdentifier: calendarId) else {
        throw BridgeError.calendarNotFound
      }
      let pred = store.predicateForEvents(withStart: start, end: end, calendars: [calendar])
      let ekEvents = store.events(matching: pred)
      let out: [EventRow] = ekEvents.map { ev in
        EventRow(
          id: ev.eventIdentifier,
          summary: ev.title,
          start: formatDate(ev.startDate),
          end: formatDate(ev.endDate),
          location: ev.location,
          description: ev.notes,
          service: "macos",
          calendarId: calendarId
        )
      }
      return try encodeJson(ListEventsResponse(events: out))
    #else
      return try encodeJson(ListEventsResponse(events: []))
    #endif
  }

  static func createEvent(body: [String: Any]) throws -> Data {
    #if os(macOS)
      guard let calendarId = body["calendarId"] as? String,
        let summary = body["summary"] as? String,
        let startStr = body["start"] as? String,
        let endStr = body["end"] as? String,
        let start = parseDate(startStr),
        let end = parseDate(endStr)
      else {
        throw BridgeError.invalidBody("create-event: missing calendarId, summary, start, or end")
      }
      let store = EKEventStore()
      guard requestCalendarAccess(store) else {
        throw BridgeError.accessDenied
      }
      guard let calendar = findCalendar(store: store, calendarIdentifier: calendarId) else {
        throw BridgeError.calendarNotFound
      }
      let event = EKEvent(eventStore: store)
      event.calendar = calendar
      event.title = summary
      event.startDate = start
      event.endDate = end
      event.location = body["location"] as? String
      event.notes = body["description"] as? String
      let attendees = body["attendees"] as? [String]
      let omitted = attendees != nil && !(attendees!.isEmpty)
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
      return try encodeJson(row)
    #else
      throw BridgeError.unsupported
    #endif
  }

  static func updateEvent(body: [String: Any]) throws -> Data {
    #if os(macOS)
      guard let calendarId = body["calendarId"] as? String,
        let eventId = body["eventId"] as? String,
        let patch = body["patch"] as? [String: Any]
      else {
        throw BridgeError.invalidBody("update-event: missing calendarId, eventId, or patch")
      }
      let store = EKEventStore()
      guard requestCalendarAccess(store) else {
        throw BridgeError.accessDenied
      }
      guard let calendar = findCalendar(store: store, calendarIdentifier: calendarId) else {
        throw BridgeError.calendarNotFound
      }
      guard let event = store.event(withIdentifier: eventId) else {
        throw BridgeError.eventNotFound
      }
      if event.calendar.calendarIdentifier != calendar.calendarIdentifier {
        throw BridgeError.calendarMismatch
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
      return try encodeJson(row)
    #else
      throw BridgeError.unsupported
    #endif
  }

  static func deleteEvent(calendarId: String, eventId: String) throws -> Data {
    #if os(macOS)
      let store = EKEventStore()
      guard requestCalendarAccess(store) else {
        throw BridgeError.accessDenied
      }
      guard let calendar = findCalendar(store: store, calendarIdentifier: calendarId) else {
        throw BridgeError.calendarNotFound
      }
      guard let event = store.event(withIdentifier: eventId) else {
        throw BridgeError.eventNotFound
      }
      if event.calendar.calendarIdentifier != calendar.calendarIdentifier {
        throw BridgeError.calendarMismatch
      }
      try store.remove(event, span: .thisEvent)
      return try encodeJson(DeleteOkResponse(ok: true))
    #else
      throw BridgeError.unsupported
    #endif
  }
}

enum BridgeError: Error, CustomStringConvertible {
  case invalidBody(String)
  case calendarNotFound
  case eventNotFound
  case calendarMismatch
  case accessDenied
  case unsupported
  case unknownOp(String)

  var description: String {
    switch self {
    case .invalidBody(let s): return s
    case .calendarNotFound: return "Calendar not found"
    case .eventNotFound: return "Event not found"
    case .calendarMismatch: return "Event calendar mismatch"
    case .accessDenied: return "Calendar access denied"
    case .unsupported: return "Unsupported platform"
    case .unknownOp(let s): return "Unknown op: \(s)"
    }
  }
}
