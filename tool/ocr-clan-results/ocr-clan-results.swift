#!/usr/bin/env swift

import AppKit
import Darwin
import Foundation
import Vision

enum SourceType: String, Codable {
  case image
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
  let imagePath: String
  let participantsPath: String
  let outputPath: String
  let maxMineTotalDiffRatio: Double
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

enum CLIError: Error, LocalizedError {
  case missingRequiredOption(String)
  case invalidOptionValue(String)
  case unsupportedImageFile(String)
  case participantsListEmpty(String)
  case cannotInferWindowFromFileName(String)
  case totalsValidationFailed(String)

  var errorDescription: String? {
    switch self {
    case .missingRequiredOption(let option):
      return "Missing required option: \(option)"
    case .invalidOptionValue(let message):
      return "Invalid option value: \(message)"
    case .unsupportedImageFile(let path):
      return "Unsupported image file extension: \(path)"
    case .participantsListEmpty(let path):
      return "Participants list is empty after parsing JSON: \(path)"
    case .cannotInferWindowFromFileName(let fileName):
      return "Cannot infer clan wars window from screenshot file name: \(fileName)"
    case .totalsValidationFailed(let message):
      return message
    }
  }
}

func printUsage() {
  let usage = """
  Usage:
    swift tool/ocr-clan-results/ocr-clan-results.swift \\
      --image /absolute/path/to/10.04.25.jpg \\
      --participants-json /absolute/path/to/clan-members.json \\
      [--output tool/ocr-clan-results/out/page-ocr-clan-wars.json] \\
      [--max-mine-total-diff-ratio 0.01]

  Supported participants JSON shapes:
    - ["Nick1", "Nick2", ...]
    - { "participants": ["Nick1", ...] }
    - { "players": [{ "nick": "Nick1" }, ...] }
  """
  print(usage)
}

func parseOptions() throws -> CLIOptions {
  var imagePath: String?
  var participantsPath: String?
  var outputPath = "tool/ocr-clan-results/out/page-ocr-clan-wars.json"
  var maxMineTotalDiffRatio = 0.01

  var index = 1
  while index < CommandLine.arguments.count {
    let arg = CommandLine.arguments[index]
    switch arg {
    case "--image", "-i":
      index += 1
      if index < CommandLine.arguments.count {
        imagePath = CommandLine.arguments[index]
      }
    case "--participants-json", "-p":
      index += 1
      if index < CommandLine.arguments.count {
        participantsPath = CommandLine.arguments[index]
      }
    case "--output", "-o":
      index += 1
      if index < CommandLine.arguments.count {
        outputPath = CommandLine.arguments[index]
      }
    case "--max-mine-total-diff-ratio":
      index += 1
      if index < CommandLine.arguments.count {
        guard let value = Double(CommandLine.arguments[index]), value >= 0 else {
          throw CLIError.invalidOptionValue("--max-mine-total-diff-ratio must be a non-negative number")
        }
        maxMineTotalDiffRatio = value
      }
    case "--help", "-h":
      printUsage()
      exit(0)
    default:
      throw CLIError.invalidOptionValue("Unknown argument: \(arg)")
    }
    index += 1
  }

  guard let imagePath else {
    throw CLIError.missingRequiredOption("--image")
  }

  guard let participantsPath else {
    throw CLIError.missingRequiredOption("--participants-json")
  }

  let lowerPath = imagePath.lowercased()
  if !(lowerPath.hasSuffix(".jpg") || lowerPath.hasSuffix(".jpeg") || lowerPath.hasSuffix(".png")) {
    throw CLIError.unsupportedImageFile(imagePath)
  }

  return CLIOptions(
    imagePath: imagePath,
    participantsPath: participantsPath,
    outputPath: outputPath,
    maxMineTotalDiffRatio: maxMineTotalDiffRatio
  )
}

func normalized(_ value: String) -> String {
  let lowered = value.lowercased()
  let mapped = lowered
    .replacingOccurrences(of: "ё", with: "е")
    .replacingOccurrences(of: "і", with: "i")
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
  let localTimeZone = TimeZone.current
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = localTimeZone

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
    let year = 2000 + yearShort

    var comps = DateComponents()
    comps.year = year
    comps.month = month
    comps.day = day
    comps.hour = 0
    comps.minute = 0
    comps.second = 0
    comps.timeZone = localTimeZone

    guard let parsedDate = calendar.date(from: comps) else {
      return nil
    }

    let roundTrip = calendar.dateComponents([.year, .month, .day], from: parsedDate)
    guard roundTrip.year == year, roundTrip.month == month, roundTrip.day == day else {
      return nil
    }

    return parsedDate
  }

  return nil
}

func parseWindow(from fileName: String) -> TournamentWindow? {
  guard let captureDate = parseCaptureDate(from: fileName) else {
    return nil
  }

  var localCalendar = Calendar(identifier: .gregorian)
  localCalendar.timeZone = TimeZone.current

  var utcCalendar = Calendar(identifier: .gregorian)
  utcCalendar.timeZone = TimeZone(secondsFromGMT: 0)!

  let localDayStart = localCalendar.startOfDay(for: captureDate)
  guard let localDayEnd = localCalendar.date(byAdding: .day, value: 1, to: localDayStart) else {
    return nil
  }

  var anchorComps = DateComponents()
  anchorComps.year = 2025
  anchorComps.month = 3
  anchorComps.day = 25
  anchorComps.hour = 9
  anchorComps.minute = 0
  anchorComps.second = 0
  anchorComps.timeZone = TimeZone(secondsFromGMT: 0)

  guard let anchorStart = utcCalendar.date(from: anchorComps) else {
    return nil
  }

  let biweeklySeconds = 14 * 24 * 60 * 60
  let windowSpanSeconds = 2 * 24 * 60 * 60
  let approxCycles = Int(floor(localDayStart.timeIntervalSince(anchorStart) / Double(biweeklySeconds)))

  var matchedStartDate: Date?
  var matchedEndDate: Date?

  for cycle in (approxCycles - 1)...(approxCycles + 1) {
    guard cycle >= 0 else {
      continue
    }

    guard
      let startDate = utcCalendar.date(byAdding: .second, value: cycle * biweeklySeconds, to: anchorStart),
      let endDate = utcCalendar.date(byAdding: .second, value: windowSpanSeconds, to: startDate)
    else {
      continue
    }

    let overlapsLocalDay = localDayStart < endDate && startDate < localDayEnd
    if overlapsLocalDay {
      matchedStartDate = startDate
      matchedEndDate = endDate
      break
    }
  }

  guard let startDate = matchedStartDate, let endDate = matchedEndDate else {
    return nil
  }

  let dayFormatter = DateFormatter()
  dayFormatter.calendar = utcCalendar
  dayFormatter.timeZone = TimeZone(secondsFromGMT: 0)
  dayFormatter.dateFormat = "yyyy-MM-dd"

  let startsOn = dayFormatter.string(from: startDate)
  let endsOn = dayFormatter.string(from: endDate)

  let dateFormatter = DateFormatter()
  dateFormatter.calendar = utcCalendar
  dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
  dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
  let startsAt = dateFormatter.string(from: startDate)
  let endsAt = dateFormatter.string(from: endDate)

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

func normalizedForMatch(_ value: String) -> String {
  let lowered = normalized(value)
  var folded = ""
  folded.reserveCapacity(lowered.count)

  for scalar in lowered.unicodeScalars {
    switch scalar {
    case "а", "a", "@":
      folded.append("a")
    case "в", "b", "8":
      folded.append("b")
    case "с", "c":
      folded.append("c")
    case "е", "e":
      folded.append("e")
    case "к", "k":
      folded.append("k")
    case "м", "m":
      folded.append("m")
    case "н", "h":
      folded.append("h")
    case "о", "o", "0":
      folded.append("o")
    case "р", "p":
      folded.append("p")
    case "т", "t":
      folded.append("t")
    case "у", "y":
      folded.append("y")
    case "х", "x":
      folded.append("x")
    case "и", "n":
      folded.append("n")
    case "л", "l":
      folded.append("l")
    case "д", "d":
      folded.append("d")
    default:
      if CharacterSet.alphanumerics.contains(scalar) {
        folded.unicodeScalars.append(scalar)
      }
    }
  }

  return folded
}

func levenshteinDistance(_ lhs: String, _ rhs: String) -> Int {
  if lhs == rhs {
    return 0
  }

  let left = Array(lhs)
  let right = Array(rhs)

  if left.isEmpty {
    return right.count
  }

  if right.isEmpty {
    return left.count
  }

  var previous = Array(0...right.count)
  var current = Array(repeating: 0, count: right.count + 1)

  for i in 1...left.count {
    current[0] = i
    for j in 1...right.count {
      let cost = left[i - 1] == right[j - 1] ? 0 : 1
      current[j] = min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      )
    }
    swap(&previous, &current)
  }

  return previous[right.count]
}

func uniquePreservingOrder(_ values: [String]) -> [String] {
  var seen = Set<String>()
  var result: [String] = []
  result.reserveCapacity(values.count)
  for value in values {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      continue
    }
    if seen.insert(trimmed).inserted {
      result.append(trimmed)
    }
  }
  return result
}

func collectNicknames(from json: Any) -> [String] {
  if let value = json as? String {
    return [value]
  }

  if let array = json as? [Any] {
    return array.flatMap(collectNicknames)
  }

  if let object = json as? [String: Any] {
    var result: [String] = []
    let collectionKeys = [
      "participants", "members", "players", "roster", "clanMembers", "clan_members", "list"
    ]
    for key in collectionKeys {
      if let nested = object[key] {
        result.append(contentsOf: collectNicknames(from: nested))
      }
    }

    let nicknameKeys = [
      "nick", "nickname", "playerNick", "player_nick", "mainNickname", "main_nickname", "name"
    ]
    for key in nicknameKeys {
      if let nickname = object[key] as? String {
        result.append(nickname)
      }
    }

    return result
  }

  return []
}

func loadParticipantsList(from path: String) throws -> [String] {
  let url = URL(fileURLWithPath: path)
  let data = try Data(contentsOf: url)
  let parsed = try JSONSerialization.jsonObject(with: data)
  let names = uniquePreservingOrder(collectNicknames(from: parsed))
  return names
}

struct NameCorrection {
  let rank: Int
  let from: String
  let to: String
  let distance: Int
}

func autocorrectNicknames(
  rows: [ClanWarsPlayerBreakdown],
  members: [String]
) -> (rows: [ClanWarsPlayerBreakdown], corrections: [NameCorrection]) {
  let maxDistanceRatio = 0.40

  guard !rows.isEmpty, !members.isEmpty else {
    return (rows, [])
  }

  struct MemberCandidate {
    let index: Int
    let name: String
    let normalized: String
  }

  let candidates = members.enumerated().map { entry in
    MemberCandidate(index: entry.offset, name: entry.element, normalized: normalizedForMatch(entry.element))
  }

  var available = Set(candidates.map(\.index))
  var assignments: [Int: (member: MemberCandidate, distance: Int)] = [:]

  for (rowIndex, row) in rows.enumerated() {
    let rowNorm = normalizedForMatch(row.playerNick)
    guard !rowNorm.isEmpty else {
      continue
    }
    if let exact = candidates.first(where: { available.contains($0.index) && $0.normalized == rowNorm }) {
      assignments[rowIndex] = (exact, 0)
      available.remove(exact.index)
    }
  }

  for (rowIndex, row) in rows.enumerated() where assignments[rowIndex] == nil {
    let rowNorm = normalizedForMatch(row.playerNick)
    guard !rowNorm.isEmpty else {
      continue
    }

    var best: (member: MemberCandidate, distance: Int, ratio: Double)?

    for candidate in candidates where available.contains(candidate.index) {
      let distance = levenshteinDistance(rowNorm, candidate.normalized)
      let base = max(rowNorm.count, candidate.normalized.count, 1)
      let ratio = Double(distance) / Double(base)

      if let current = best {
        if ratio < current.ratio
          || (ratio == current.ratio && distance < current.distance)
          || (ratio == current.ratio && distance == current.distance && candidate.name < current.member.name)
        {
          best = (candidate, distance, ratio)
        }
      } else {
        best = (candidate, distance, ratio)
      }
    }

    if let best, best.ratio <= maxDistanceRatio {
      assignments[rowIndex] = (best.member, best.distance)
      available.remove(best.member.index)
    }
  }

  var correctedRows: [ClanWarsPlayerBreakdown] = []
  correctedRows.reserveCapacity(rows.count)

  var corrections: [NameCorrection] = []

  for (rowIndex, row) in rows.enumerated() {
    guard let assignment = assignments[rowIndex] else {
      correctedRows.append(row)
      continue
    }

    let corrected = ClanWarsPlayerBreakdown(
      rank: row.rank,
      playerNick: assignment.member.name,
      points: row.points
    )
    correctedRows.append(corrected)

    if row.playerNick != assignment.member.name {
      corrections.append(
        NameCorrection(
          rank: row.rank,
          from: row.playerNick,
          to: assignment.member.name,
          distance: assignment.distance
        )
      )
    }
  }

  return (correctedRows, corrections)
}

func ensureParentDirectory(for path: String) throws {
  let parent = URL(fileURLWithPath: path).deletingLastPathComponent()
  try FileManager.default.createDirectory(at: parent, withIntermediateDirectories: true)
}

func validateMineTotal(
  tournament: ClanWarsTournamentImport,
  maxDiffRatio: Double
) throws {
  guard let mineTotal = tournament.totals.mine, mineTotal > 0 else {
    throw CLIError.totalsValidationFailed(
      "OCR validation failed: cannot read valid totals.mine for \(tournament.sourceFile)"
    )
  }

  let oursSum = tournament.playersOurs.reduce(0) { $0 + $1.points }
  let absoluteDiff = abs(oursSum - mineTotal)
  let diffRatio = Double(absoluteDiff) / Double(max(mineTotal, 1))

  if diffRatio > maxDiffRatio {
    let percent = diffRatio * 100.0
    throw CLIError.totalsValidationFailed(
      String(
        format: "OCR validation failed: oursSum=%d, totals.mine=%d, diff=%d (%.2f%%), threshold=%.2f%%",
        oursSum,
        mineTotal,
        absoluteDiff,
        percent,
        maxDiffRatio * 100.0
      )
    )
  }
}

do {
  let options = try parseOptions()
  let imageURL = URL(fileURLWithPath: options.imagePath)
  let fileName = imageURL.lastPathComponent

  guard let window = parseWindow(from: fileName) else {
    throw CLIError.cannotInferWindowFromFileName(fileName)
  }

  let participants = try loadParticipantsList(from: options.participantsPath)
  guard !participants.isEmpty else {
    throw CLIError.participantsListEmpty(options.participantsPath)
  }

  let tokens = try readImageTokens(imageURL)
  let rawRows = extractOursBreakdownFromImage(tokens)
  let correctionResult = autocorrectNicknames(rows: rawRows, members: participants)

  let tournament = ClanWarsTournamentImport(
    sourceFile: fileName,
    sourceType: .image,
    sourceReportKey: window.sourceReportKey,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    hasPersonalRewards: extractHasPersonalRewards(tokens),
    opponentClanName: extractOpponentClanNameFromImage(tokens),
    totals: extractTotalsFromImage(tokens),
    playersOurs: correctionResult.rows
  )

  let report = CanonicalClanWarsImportReport(
    generatedAt: ISO8601DateFormatter().string(from: Date()),
    inputDirectory: imageURL.deletingLastPathComponent().path,
    activity: "clan_wars",
    tournaments: [tournament]
  )

  let encoder = JSONEncoder()
  encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
  let data = try encoder.encode(report)
  try ensureParentDirectory(for: options.outputPath)
  try data.write(to: URL(fileURLWithPath: options.outputPath))

  print("Wrote canonical import report: \(options.outputPath)")
  print("Screenshot: \(fileName)")
  print("Participants loaded: \(participants.count)")
  print("Players detected (ours): \(tournament.playersOurs.count)")

  if correctionResult.corrections.isEmpty {
    print("Nickname auto-corrections: 0")
  } else {
    print("Nickname auto-corrections: \(correctionResult.corrections.count)")
    for correction in correctionResult.corrections {
      print("  #\(correction.rank): '\(correction.from)' -> '\(correction.to)' (distance=\(correction.distance))")
    }
  }

  do {
    try validateMineTotal(tournament: tournament, maxDiffRatio: options.maxMineTotalDiffRatio)
    let oursSum = tournament.playersOurs.reduce(0) { $0 + $1.points }
    print("Mine total validation: OK (\(oursSum) vs \(tournament.totals.mine ?? 0))")
  } catch {
    fputs("ERROR: \(error.localizedDescription)\n", stderr)
    exit(2)
  }
} catch {
  fputs("ERROR: \(error.localizedDescription)\n", stderr)
  fputs("\n", stderr)
  printUsage()
  exit(1)
}
