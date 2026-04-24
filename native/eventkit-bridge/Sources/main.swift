import Darwin
import Foundation
import Security

// MARK: - Paths & token

private func calenditDataDirectory() -> URL {
  if let env = ProcessInfo.processInfo.environment["CALENDIT_CONFIG_DIR"], !env.isEmpty {
    return URL(fileURLWithPath: env, isDirectory: true)
  }
  let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
  return base.appendingPathComponent("calendit", isDirectory: true)
}

private func defaultSocketURL() -> URL {
  calenditDataDirectory().appendingPathComponent("eventkit-bridge.sock", isDirectory: false)
}

private func tokenURL() -> URL {
  calenditDataDirectory().appendingPathComponent("bridge.token", isDirectory: false)
}

private func generateToken() -> String {
  var bytes = [UInt8](repeating: 0, count: 32)
  let r = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
  if r != errSecSuccess {
    return UUID().uuidString + UUID().uuidString
  }
  return Data(bytes).base64EncodedString()
}

private func writeTokenFile(token: String) throws {
  let dir = calenditDataDirectory()
  try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  let url = tokenURL()
  let data = Data(token.utf8)
  try data.write(to: url, options: .atomic)
  try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
}

private func readExpectedToken() throws -> String {
  let url = tokenURL()
  guard FileManager.default.fileExists(atPath: url.path) else {
    throw NSError(domain: "bridge", code: 1, userInfo: [NSLocalizedDescriptionKey: "bridge.token missing"])
  }
  return try String(contentsOf: url, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
}

// MARK: - Unix socket server

private func unlinkPath(_ path: String) {
  unlink(path)
}

private func bindUnixSocket(path: String) throws -> Int32 {
  unlinkPath(path)
  let fd = socket(AF_UNIX, SOCK_STREAM, 0)
  guard fd >= 0 else {
    throw NSError(domain: "bridge", code: 2, userInfo: [NSLocalizedDescriptionKey: "socket() failed errno=\(errno)"])
  }
  var addr = sockaddr_un()
  memset(&addr, 0, MemoryLayout.size(ofValue: addr))
  addr.sun_family = sa_family_t(AF_UNIX)
  let maxPath = MemoryLayout.size(ofValue: addr.sun_path) - 1
  let cPathLen = path.utf8.count
  guard cPathLen < maxPath else {
    close(fd)
    throw NSError(domain: "bridge", code: 3, userInfo: [NSLocalizedDescriptionKey: "socket path too long"])
  }
  _ = path.withCString { src in
    withUnsafeMutablePointer(to: &addr.sun_path) { sp in
      sp.withMemoryRebound(to: CChar.self, capacity: maxPath) { dest in
        strncpy(dest, src, maxPath)
      }
    }
  }
  let sunPathOffset = MemoryLayout.offset(of: \sockaddr_un.sun_path)!
  let bindLen = socklen_t(sunPathOffset + cPathLen + 1)
  let bindResult = withUnsafePointer(to: &addr) {
    $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
      bind(fd, $0, bindLen)
    }
  }
  guard bindResult == 0 else {
    let e = errno
    close(fd)
    throw NSError(domain: "bridge", code: 4, userInfo: [NSLocalizedDescriptionKey: "bind() failed errno=\(e)"])
  }
  guard listen(fd, 16) == 0 else {
    let e = errno
    close(fd)
    throw NSError(domain: "bridge", code: 5, userInfo: [NSLocalizedDescriptionKey: "listen() failed errno=\(e)"])
  }
  return fd
}

private func readOneLine(fd: Int32) throws -> String {
  var buffer = Data()
  var ch: UInt8 = 0
  while true {
    let n = read(fd, &ch, 1)
    if n < 0 {
      throw NSError(domain: "bridge", code: 6, userInfo: [NSLocalizedDescriptionKey: "read errno=\(errno)"])
    }
    if n == 0 {
      break
    }
    if ch == 10 { break }
    buffer.append(ch)
  }
  guard let s = String(data: buffer, encoding: .utf8) else {
    throw NSError(domain: "bridge", code: 7, userInfo: [NSLocalizedDescriptionKey: "invalid UTF-8"])
  }
  return s
}

private func writeAll(fd: Int32, data: Data) throws {
  try data.withUnsafeBytes { raw in
    guard let base = raw.bindMemory(to: UInt8.self).baseAddress else { return }
    var sent = 0
    let total = data.count
    while sent < total {
      let n = write(fd, base + sent, total - sent)
      if n < 0 {
        throw NSError(domain: "bridge", code: 8, userInfo: [NSLocalizedDescriptionKey: "write errno=\(errno)"])
      }
      sent += n
    }
  }
}

private func errorResponse(message: String, code: Int) throws -> Data {
  let obj: [String: Any] = [
    "ok": false, "error": message, "code": code, "bridgeError": true,
  ]
  let d = try JSONSerialization.data(withJSONObject: obj, options: [.sortedKeys])
  var out = d
  out.append(10)
  return out
}

private func handleRequestLine(line: String, expectedToken: String) throws -> Data {
  guard let data = line.data(using: .utf8),
    let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
    let op = root["op"] as? String
  else {
    return try errorResponse(message: "Invalid JSON or missing op", code: 400)
  }
  let v = root["v"] as? Int ?? 0
  if v != 1 {
    return try errorResponse(message: "Unsupported protocol version", code: 400)
  }
  if let tok = root["token"] as? String {
    if tok != expectedToken {
      return try errorResponse(message: "Unauthorized", code: 401)
    }
  } else {
    return try errorResponse(message: "Missing token", code: 401)
  }

  let body = root["body"] as? [String: Any] ?? [:]

  do {
    let payload: Data
    switch op {
    case "doctor":
      payload = try EventKitOps.doctor()
    case "list-calendars":
      payload = try EventKitOps.listCalendars()
    case "list-events":
      guard let cal = body["calendarId"] as? String,
        let start = body["start"] as? String,
        let end = body["end"] as? String
      else {
        return try errorResponse(message: "list-events requires body.calendarId, start, end", code: 400)
      }
      payload = try EventKitOps.listEvents(calendarId: cal, startIso: start, endIso: end)
    case "create-event":
      payload = try EventKitOps.createEvent(body: body)
    case "update-event":
      payload = try EventKitOps.updateEvent(body: body)
    case "delete-event":
      guard let cal = body["calendarId"] as? String,
        let eid = body["eventId"] as? String
      else {
        return try errorResponse(message: "delete-event requires body.calendarId and eventId", code: 400)
      }
      payload = try EventKitOps.deleteEvent(calendarId: cal, eventId: eid)
    default:
      return try errorResponse(message: "Unknown op: \(op)", code: 400)
    }
    var out = payload
    out.append(10)
    return out
  } catch let e as BridgeError {
    return try errorResponse(message: e.description, code: 500)
  } catch {
    return try errorResponse(message: error.localizedDescription, code: 500)
  }
}

private func serveLoop(socketPath: String, expectedToken: String) throws {
  let serverFd = try bindUnixSocket(path: socketPath)
  defer {
    close(serverFd)
    unlinkPath(socketPath)
  }
  FileHandle.standardError.write(
    Data(
      "eventkit-bridge listening on \(socketPath)\nToken file: \(tokenURL().path)\n".utf8))

  while true {
    var clientAddr = sockaddr_un()
    var clientLen: socklen_t = socklen_t(MemoryLayout.size(ofValue: clientAddr))
    let clientFd = withUnsafeMutablePointer(to: &clientAddr) {
      $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        accept(serverFd, $0, &clientLen)
      }
    }
    guard clientFd >= 0 else { continue }
    defer { close(clientFd) }
    do {
      let line = try readOneLine(fd: clientFd)
      let response = try handleRequestLine(line: line, expectedToken: expectedToken)
      try writeAll(fd: clientFd, data: response)
    } catch {
      if let errData = try? errorResponse(message: error.localizedDescription, code: 500) {
        try? writeAll(fd: clientFd, data: errData)
      }
    }
  }
}

private func printUsage() {
  let msg = """
    Usage:
      eventkit-bridge serve [--socket <path>]
    Launched from CalenditEventKitBridge.app (Finder / LaunchAgent) with no args → serve is implied.
    Writes bridge.token and listens on Unix socket (default: ~/Library/Application Support/calendit/…).
    """
  FileHandle.standardError.write(Data(msg.utf8))
}

/// Finder / Login Items pass `-psn_*` instead of a subcommand; treat as `serve`.
private func normalizedArguments() -> [String] {
  let raw = CommandLine.arguments
  let filtered = raw.filter { !$0.hasPrefix("-psn_") }
  if filtered.count < 2 {
    if filtered.isEmpty {
      return ["eventkit-bridge", "serve"]
    }
    return [filtered[0], "serve"]
  }
  return filtered
}

do {
  let args = normalizedArguments()
  guard args.count >= 2, args[1] == "serve" else {
    printUsage()
    exit(2)
  }
  var socketPath = defaultSocketURL().path
  var i = 2
  while i < args.count {
    if args[i] == "--socket", i + 1 < args.count {
      socketPath = args[i + 1]
      i += 2
    } else {
      i += 1
    }
  }
  let token = generateToken()
  try writeTokenFile(token: token)
  try serveLoop(socketPath: socketPath, expectedToken: token)
} catch {
  FileHandle.standardError.write(Data("\(error.localizedDescription)\n".utf8))
  exit(1)
}
