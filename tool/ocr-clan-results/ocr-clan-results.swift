#!/usr/bin/env swift

import AppKit
import Foundation
import Vision

enum SourceType: String, Codable {
  case image
  case markdown
}

struct ClanWarsTotals: Codable {
  let mine: Int?
  let opponent: Int?
}

struct ClanWarsPlayerBreakdown: Codable {
  let rank: Int
  let playerNick: String
  let points: Int
}

struct ClanWarsTournamentImport: Codable {
  let sourceFile: String
  let sourceType: SourceType
  let sourceReportKey: String
  let startsAt: String
  let endsAt: String
  let hasPersonalRewards: Int
  let opponentClanName: String?
  let totals: ClanWarsTotals
  let playersOurs: [ClanWarsPlayerBreakdown]
}

struct CanonicalClanWarsImportReport: Codable {
  let generatedAt: String
  let inputDirectory: String
  let activity: String
  let tournaments: [ClanWarsTournamentImport]
}

struct CLIOptions {
  let inputDirectory: String
  let outputPath: String
}

struct OCRToken {
  let text: String
  let x: Double
  let y: Double
  let confidence: Double
}

struct TournamentWindow {
  let sourceReportKey: String
  let startsAt: String
  let endsAt: String
}

func parseOptions() -> CLIOptions {
  var inputDirectory = NSHomeDirectory() + "/Downloads/clanwars"
  var outputPath = "tool/ocr-clan-results/out/clanwars-canonical-import.json"

  var index = 1
  while index < CommandLine.arguments.count {
    let arg = CommandLine.arguments[index]
    switch arg {
    case "--input", "-i":
      index += 1
      if index < CommandLine.arguments.count {
        inputDirectory = CommandLine.arguments[index]
      }
    case "--output", "-o":
      index += 1
      if index < CommandLine.arguments.count {
        outputPath = CommandLine.arguments[index]
      }
    default:
      break
    }
    index += 1
  }

  return CLIOptions(inputDirectory: inputDirectory, outputPath: outputPath)
}

func normalized(_ value: String) -> String {
  let lowered = value.lowercased()
  let mapped = lowered
    .replacingOccurrences(of: "ё", with: "е")
    .replacingOccurrences(of: "і", with: "и")
  let collapsed = mapped.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
  return collapsed.trimmingCharacters(in: .whitespacesAndNewlines)
}

func digitsOnly(_ value: String) -> String {
  String(value.unicodeScalars.filter { CharacterSet.decimalDigits.contains($0) })
}

func parseInt(_ value: String) -> Int? {
  let digits = digitsOnly(value)
  guard !digits.isEmpty else {
    return nil
  }
  return Int(digits)
}

func parseIntClamped(_ value: String, max: Int) -> Int? {
  var digits = digitsOnly(value)
  while let number = Int(digits), number > max, digits.count > 1 {
    digits.removeLast()
  }
  return Int(digits)
}

func containsLetter(_ value: String) -> Bool {
  value.unicodeScalars.contains { CharacterSet.letters.contains($0) }
}

func parseCaptureDate(from fileName: String) -> Date? {
  let calendar = Calendar(identifier: .gregorian)

  let numericPattern = #"^(\d{2})\.(\d{2})\.(\d{2})"#
  if
    let regex = try? NSRegularExpression(pattern: numericPattern),
    let match = regex.firstMatch(in: fileName, range: NSRange(location: 0, length: fileName.utf16.count)),
    let dayRange = Range(match.range(at: 1), in: fileName),
    let monthRange = Range(match.range(at: 2), in: fileName),
    let yearRange = Range(match.range(at: 3), in: fileName),
    let day = Int(fileName[dayRange]),
    let month = Int(fileName[monthRange]),
    let yearShort = Int(fileName[yearRange])
  {
    var comps = DateComponents()
    comps.year = 2000 + yearShort
    comps.month = month
    comps.day = day
    comps.hour = 0
    comps.minute = 0
    comps.second = 0
    comps.timeZone = TimeZone(secondsFromGMT: 0)
    return calendar.date(from: comps)
  }

  let englishPattern = #"^(january|february|march|april|may|june|july|august|september|october|november|december)-(\d{1,2})-clanwars-report"#
  if
    let regex = try? NSRegularExpression(pattern: englishPattern),
    let match = regex.firstMatch(in: fileName.lowercased(), range: NSRange(location: 0, length: fileName.utf16.count)),
    let monthRange = Range(match.range(at: 1), in: fileName.lowercased()),
    let dayRange = Range(match.range(at: 2), in: fileName.lowercased()),
    let day = Int(fileName.lowercased()[dayRange])
  {
    let monthMap: [String: Int] = [
      "january": 1,
      "february": 2,
      "march": 3,
      "april": 4,
      "may": 5,
      "june": 6,
      "july": 7,
      "august": 8,
      "september": 9,
      "october": 10,
      "november": 11,
      "december": 12
    ]
    guard let month = monthMap[String(fileName.lowercased()[monthRange])] else {
      return nil
    }

    var comps = DateComponents()
    comps.year = 2025
    comps.month = month
    comps.day = day
    comps.hour = 0
    comps.minute = 0
    comps.second = 0
    comps.timeZone = TimeZone(secondsFromGMT: 0)
    return calendar.date(from: comps)
  }

  return nil
}

func parseWindow(from fileName: String) -> TournamentWindow? {
  guard let captureDate = parseCaptureDate(from: fileName) else {
    return nil
  }

  let calendar = Calendar(identifier: .gregorian)
  var anchorComps = DateComponents()
  anchorComps.year = 2025
  anchorComps.month = 3
  anchorComps.day = 25
  anchorComps.hour = 0
  anchorComps.minute = 0
  anchorComps.second = 0
  anchorComps.timeZone = TimeZone(secondsFromGMT: 0)

  guard let anchorStart = calendar.date(from: anchorComps) else {
    return nil
  }

  let biweeklySeconds = 14 * 24 * 60 * 60
  let windowSpanSeconds = 2 * 24 * 60 * 60
  let deltaSeconds = Int(captureDate.timeIntervalSince(anchorStart))
  let cycles = max(0, deltaSeconds / biweeklySeconds)

  guard
    let startDate = calendar.date(byAdding: .second, value: cycles * biweeklySeconds, to: anchorStart),
    let endDate = calendar.date(byAdding: .second, value: windowSpanSeconds, to: startDate)
  else {
    return nil
  }

  if captureDate < startDate || captureDate > endDate {
    return nil
  }

  let dayFormatter = DateFormatter()
  dayFormatter.calendar = calendar
  dayFormatter.timeZone = TimeZone(secondsFromGMT: 0)
  dayFormatter.dateFormat = "yyyy-MM-dd"

  let startsOn = dayFormatter.string(from: startDate)
  let endsOn = dayFormatter.string(from: endDate)
  let startsAt = startsOn + "T00:00:00Z"
  let endsAt = endsOn + "T00:00:00Z"

  return TournamentWindow(
    sourceReportKey: "clan_wars:\(startsOn)_\(endsOn)",
    startsAt: startsAt,
    endsAt: endsAt
  )
}

func readImageTokens(_ url: URL) throws -> [OCRToken] {
  guard let image = NSImage(contentsOf: url) else {
    throw NSError(domain: "ocr", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot load image at \(url.path)"])
  }

  var rect = NSRect(origin: .zero, size: image.size)
  guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
    throw NSError(domain: "ocr", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot create CGImage for \(url.path)"])
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["ru-RU", "uk-UA", "en-US"]

  let handler = VNImageRequestHandler(cgImage: cgImage)
  try handler.perform([request])

  let observations = request.results ?? []
  return observations.compactMap { observation in
    guard let candidate = observation.topCandidates(1).first else {
      return nil
    }

    let box = observation.boundingBox
    return OCRToken(
      text: candidate.string,
      x: Double(box.minX),
      y: Double(box.minY),
      confidence: Double(candidate.confidence)
    )
  }
}

func readMarkdownTokens(_ url: URL) throws -> [OCRToken] {
  let text = try String(contentsOf: url, encoding: .utf8)
  let lines = text
    .split(separator: "\n")
    .map { String($0) }
    .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

  var y = 1.0
  return lines.map { line in
    defer { y -= 0.01 }
    return OCRToken(text: line, x: 0.0, y: y, confidence: 1.0)
  }
}

func extractHasPersonalRewards(_ tokens: [OCRToken]) -> Int {
  let patterns = ["личные награды", "личные", "nuyhbie", "nu4hbie"]
  for token in tokens {
    let n = normalized(token.text)
    if patterns.contains(where: { n.contains($0) }) {
      return 1
    }
  }
  return 0
}

func extractTotalsFromImage(_ tokens: [OCRToken]) -> ClanWarsTotals {
  let oursCandidate = tokens
    .filter { $0.x >= 0.16 && $0.x <= 0.35 && $0.y > 0.88 }
    .compactMap { token -> (Double, Int)? in
      guard let parsed = parseIntClamped(token.text, max: 20_000_000), parsed >= 1_000_000 else {
        return nil
      }
      return (token.y, parsed)
    }
    .sorted { $0.0 > $1.0 }
    .first?.1

  let opponentCandidate = tokens
    .filter { $0.x >= 0.84 && $0.y > 0.88 }
    .compactMap { token -> (Double, Int)? in
      guard let parsed = parseIntClamped(token.text, max: 20_000_000), parsed >= 1_000_000 else {
        return nil
      }
      return (token.y, parsed)
    }
    .sorted { $0.0 > $1.0 }
    .first?.1

  return ClanWarsTotals(mine: oursCandidate, opponent: opponentCandidate)
}

func extractOpponentClanNameFromImage(_ tokens: [OCRToken]) -> String? {
  let candidate = tokens
    .filter { $0.x >= 0.66 && $0.x <= 0.90 && $0.y > 0.88 && containsLetter($0.text) }
    .sorted { $0.y > $1.y }
    .first?.text

  guard var clan = candidate else {
    return nil
  }

  clan = clan.replacingOccurrences(of: #"\[[^\]]*ур\.?[^\]]*\]"#, with: "", options: [.regularExpression, .caseInsensitive])
  clan = clan.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
  clan = clan.trimmingCharacters(in: .whitespacesAndNewlines)
  return clan.isEmpty ? candidate : clan
}

func isHeaderOrNoiseName(_ text: String) -> Bool {
  let n = normalized(text)
  let patterns = [
    "турнир", "ход турнира", "клановые", "личные", "награды", "задания", "участники", "рейтинг", "вильне братство", "vs"
  ]
  return patterns.contains(where: { n.contains($0) })
}

func extractOursBreakdownFromImage(_ tokens: [OCRToken]) -> [ClanWarsPlayerBreakdown] {
  let vsY = tokens
    .first(where: { normalized($0.text) == "vs" || normalized($0.text).contains(" vs") || normalized($0.text).contains("vs ") })?
    .y ?? 0.92

  let ranks = tokens
    .filter { $0.x >= 0.55 && $0.x <= 0.63 && $0.y < vsY }
    .compactMap { token -> (Double, Int)? in
      guard let rank = parseInt(token.text), rank >= 1, rank <= 30 else {
        return nil
      }
      return (token.y, rank)
    }
    .sorted { $0.0 > $1.0 }

  let names = tokens
    .filter { $0.x >= 0.31 && $0.x <= 0.56 && $0.y < vsY && $0.y < 0.90 }
    .filter { containsLetter($0.text) && !isHeaderOrNoiseName($0.text) }
    .sorted { $0.y > $1.y }

  let points = tokens
    .filter { $0.x >= 0.17 && $0.x <= 0.31 && $0.y < vsY && $0.y < 0.90 }
    .compactMap { token -> (Double, Int)? in
      guard let value = parseInt(token.text), value >= 1_000, value <= 2_500_000 else {
        return nil
      }
      return (token.y, value)
    }
    .sorted { $0.0 > $1.0 }

  let count = min(ranks.count, names.count, points.count)
  if count == 0 {
    return []
  }

  var rows: [ClanWarsPlayerBreakdown] = []
  rows.reserveCapacity(count)

  for index in 0..<count {
    rows.append(
      ClanWarsPlayerBreakdown(
        rank: ranks[index].1,
        playerNick: names[index].text,
        points: points[index].1
      )
    )
  }

  return rows
}

func extractTotalsFromMarkdown(_ text: String) -> ClanWarsTotals {
  var mine: Int?
  var opponent: Int?

  for line in text.split(separator: "\n").map(String.init) {
    let n = normalized(line)
    if n.contains("очки вильне братство") {
      mine = parseInt(line)
    } else if n.contains("очки ") && n.contains("matrix") {
      opponent = parseInt(line)
    }
  }

  return ClanWarsTotals(mine: mine, opponent: opponent)
}

func extractOpponentClanNameFromMarkdown(_ text: String) -> String? {
  let pattern = #"\*\*[^*]+\*\*\s+и\s+\*\*([^*]+)\*\*"#
  guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
    return nil
  }
  guard let match = regex.firstMatch(in: text, range: NSRange(location: 0, length: text.utf16.count)) else {
    return nil
  }
  guard let range = Range(match.range(at: 1), in: text) else {
    return nil
  }
  return String(text[range]).trimmingCharacters(in: .whitespacesAndNewlines)
}

func extractOursBreakdownFromMarkdown(_ text: String) -> [ClanWarsPlayerBreakdown] {
  let lines = text.split(separator: "\n").map(String.init)
  var inOursSection = false
  var rows: [ClanWarsPlayerBreakdown] = []

  for line in lines {
    if line.contains("### **Вільне Братство") {
      inOursSection = true
      continue
    }

    if inOursSection && line.contains("### **") {
      break
    }

    guard inOursSection else {
      continue
    }

    let pattern = #"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([0-9,\s]+)\s*\|"#
    guard
      let regex = try? NSRegularExpression(pattern: pattern),
      let match = regex.firstMatch(in: line, range: NSRange(location: 0, length: line.utf16.count)),
      let rankRange = Range(match.range(at: 1), in: line),
      let nameRange = Range(match.range(at: 2), in: line),
      let pointsRange = Range(match.range(at: 3), in: line),
      let rank = Int(line[rankRange]),
      let points = parseInt(String(line[pointsRange]))
    else {
      continue
    }

    let name = String(line[nameRange]).trimmingCharacters(in: .whitespacesAndNewlines)
    rows.append(ClanWarsPlayerBreakdown(rank: rank, playerNick: name, points: points))
  }

  return rows
}

func sourceType(for fileName: String) -> SourceType? {
  let lower = fileName.lowercased()
  if lower.hasSuffix(".jpg") || lower.hasSuffix(".jpeg") || lower.hasSuffix(".png") {
    return .image
  }
  if lower.hasSuffix(".md") || lower.hasSuffix(".txt") {
    return .markdown
  }
  return nil
}

func ensureParentDirectory(for path: String) throws {
  let parent = URL(fileURLWithPath: path).deletingLastPathComponent()
  try FileManager.default.createDirectory(at: parent, withIntermediateDirectories: true)
}

let options = parseOptions()
let fm = FileManager.default
let inputURL = URL(fileURLWithPath: options.inputDirectory)

let files = try fm.contentsOfDirectory(at: inputURL, includingPropertiesForKeys: nil)
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

var tournaments: [ClanWarsTournamentImport] = []

for fileURL in files {
  let fileName = fileURL.lastPathComponent
  guard let type = sourceType(for: fileName), let window = parseWindow(from: fileName) else {
    continue
  }

  switch type {
  case .image:
    let tokens = try readImageTokens(fileURL)
    let tournament = ClanWarsTournamentImport(
      sourceFile: fileName,
      sourceType: .image,
      sourceReportKey: window.sourceReportKey,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      hasPersonalRewards: extractHasPersonalRewards(tokens),
      opponentClanName: extractOpponentClanNameFromImage(tokens),
      totals: extractTotalsFromImage(tokens),
      playersOurs: extractOursBreakdownFromImage(tokens)
    )
    tournaments.append(tournament)

  case .markdown:
    let text = try String(contentsOf: fileURL, encoding: .utf8)
    let markdownTokens = try readMarkdownTokens(fileURL)
    let tournament = ClanWarsTournamentImport(
      sourceFile: fileName,
      sourceType: .markdown,
      sourceReportKey: window.sourceReportKey,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      hasPersonalRewards: extractHasPersonalRewards(markdownTokens),
      opponentClanName: extractOpponentClanNameFromMarkdown(text),
      totals: extractTotalsFromMarkdown(text),
      playersOurs: extractOursBreakdownFromMarkdown(text)
    )
    tournaments.append(tournament)
  }
}

let sortedTournaments = tournaments.sorted { $0.startsAt < $1.startsAt }

let report = CanonicalClanWarsImportReport(
  generatedAt: ISO8601DateFormatter().string(from: Date()),
  inputDirectory: options.inputDirectory,
  activity: "clan_wars",
  tournaments: sortedTournaments
)

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
let data = try encoder.encode(report)
try ensureParentDirectory(for: options.outputPath)
try data.write(to: URL(fileURLWithPath: options.outputPath))

print("Wrote canonical import report: \(options.outputPath)")
print("Tournaments parsed: \(sortedTournaments.count)")

let rewards = sortedTournaments.filter { $0.hasPersonalRewards == 1 }
print("has_personal_rewards=1 windows: \(rewards.count)")
for window in rewards {
  print("- \(window.startsAt) .. \(window.endsAt) [\(window.sourceFile)]")
}
