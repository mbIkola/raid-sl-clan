#!/usr/bin/env swift

import AppKit
import Foundation
import Vision

enum SourceType: String, Codable {
  case image
  case markdown
}

struct OCRLine: Codable {
  let text: String
  let confidence: Double
  let boundingBox: [Double]
}

struct TournamentWindow: Codable {
  let sourceReportKey: String
  let startsOn: String
  let endsOn: String
  let startsAtUtc: String
  let endsAtUtc: String
}

struct RewardInference: Codable {
  let hasPersonalRewards: Bool
  let confidence: Double
  let decision: String
  let evidence: [String]
}

struct OCRPageClanWars: Codable {
  let fileName: String
  let sourceType: SourceType
  let window: TournamentWindow?
  let rewardInference: RewardInference
  let lineCount: Int
  let lines: [OCRLine]
}

struct WindowRecommendation: Codable {
  let sourceReportKey: String
  let startsAtUtc: String
  let endsAtUtc: String
  let confidence: Double
  let evidence: [String]
  let sourceFile: String
}

struct OCRRunReport: Codable {
  let generatedAt: String
  let inputDirectory: String
  let modelName: String
  let pages: [OCRPageClanWars]
  let recommendedPersonalRewardsWindows: [WindowRecommendation]
}

struct CLIOptions {
  let inputDirectory: String
  let outputPath: String
  let minConfidence: Double
}

func parseOptions() -> CLIOptions {
  var inputDirectory = NSHomeDirectory() + "/Downloads/clanwars"
  var outputPath = "tool/ocr-clan-results/out/clanwars-ocr-report.json"
  var minConfidence = 0.8

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
    case "--min-confidence":
      index += 1
      if index < CommandLine.arguments.count, let value = Double(CommandLine.arguments[index]) {
        minConfidence = value
      }
    default:
      break
    }
    index += 1
  }

  return CLIOptions(inputDirectory: inputDirectory, outputPath: outputPath, minConfidence: minConfidence)
}

func normalized(_ value: String) -> String {
  let lowered = value.lowercased()
  let mapped = lowered.replacingOccurrences(of: "ё", with: "е")
  let collapsed = mapped.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
  return collapsed.trimmingCharacters(in: .whitespacesAndNewlines)
}

func inferRewards(from lines: [OCRLine]) -> RewardInference {
  let normalizedLines = lines.map { normalized($0.text) }

  let positivePatterns = [
    "личные награды",
    "личные",
    "лиичные",
    "nuyhbie",
    "nu4hbie",
    "личн"
  ]

  var evidence: [String] = []
  var topConfidence = 0.0

  for (idx, line) in normalizedLines.enumerated() {
    if positivePatterns.contains(where: { line.contains($0) }) {
      evidence.append(lines[idx].text)
      topConfidence = max(topConfidence, lines[idx].confidence)
    }
  }

  if !evidence.isEmpty {
    return RewardInference(
      hasPersonalRewards: true,
      confidence: max(0.8, topConfidence),
      decision: "confirmed_by_ocr_marker",
      evidence: Array(evidence.prefix(5))
    )
  }

  return RewardInference(
    hasPersonalRewards: false,
    confidence: 0.6,
    decision: "marker_not_found",
    evidence: []
  )
}

func parseCaptureDate(from fileName: String) -> Date? {
  let pattern = #"^(\d{2})\.(\d{2})\.(\d{2})"#
  guard
    let regex = try? NSRegularExpression(pattern: pattern),
    let match = regex.firstMatch(in: fileName, range: NSRange(location: 0, length: fileName.utf16.count)),
    let dayRange = Range(match.range(at: 1), in: fileName),
    let monthRange = Range(match.range(at: 2), in: fileName),
    let yearRange = Range(match.range(at: 3), in: fileName),
    let day = Int(fileName[dayRange]),
    let month = Int(fileName[monthRange]),
    let yearShort = Int(fileName[yearRange])
  else {
    return nil
  }

  let year = 2000 + yearShort
  var comps = DateComponents()
  comps.year = year
  comps.month = month
  comps.day = day
  comps.hour = 0
  comps.minute = 0
  comps.second = 0
  comps.timeZone = TimeZone(secondsFromGMT: 0)

  let calendar = Calendar(identifier: .gregorian)
  return calendar.date(from: comps)
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
  let startsAtUtc = startsOn + "T00:00:00Z"
  let endsAtUtc = endsOn + "T00:00:00Z"
  let sourceReportKey = "clan_wars:\(startsOn)_\(endsOn)"

  return TournamentWindow(
    sourceReportKey: sourceReportKey,
    startsOn: startsOn,
    endsOn: endsOn,
    startsAtUtc: startsAtUtc,
    endsAtUtc: endsAtUtc
  )
}

func readMarkdownLines(_ url: URL) throws -> [OCRLine] {
  let text = try String(contentsOf: url, encoding: .utf8)
  return text
    .split(separator: "\n")
    .map { String($0) }
    .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
    .map {
      OCRLine(text: $0, confidence: 1.0, boundingBox: [0.0, 0.0, 0.0, 0.0])
    }
}

func readImageLines(_ url: URL) throws -> [OCRLine] {
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
    guard let best = observation.topCandidates(1).first else {
      return nil
    }

    let box = observation.boundingBox
    return OCRLine(
      text: best.string,
      confidence: Double(best.confidence),
      boundingBox: [Double(box.minX), Double(box.minY), Double(box.width), Double(box.height)]
    )
  }
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

let allFiles = try fm.contentsOfDirectory(at: inputURL, includingPropertiesForKeys: nil)
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

var pages: [OCRPageClanWars] = []

for fileURL in allFiles {
  let fileName = fileURL.lastPathComponent
  guard let type = sourceType(for: fileName) else {
    continue
  }

  let lines: [OCRLine]
  switch type {
  case .image:
    lines = try readImageLines(fileURL)
  case .markdown:
    lines = try readMarkdownLines(fileURL)
  }

  let reward = inferRewards(from: lines)
  let page = OCRPageClanWars(
    fileName: fileName,
    sourceType: type,
    window: parseWindow(from: fileName),
    rewardInference: reward,
    lineCount: lines.count,
    lines: lines
  )
  pages.append(page)
}

let recommendations = pages.compactMap { page -> WindowRecommendation? in
  guard
    let window = page.window,
    page.rewardInference.hasPersonalRewards,
    page.rewardInference.confidence >= options.minConfidence
  else {
    return nil
  }

  return WindowRecommendation(
    sourceReportKey: window.sourceReportKey,
    startsAtUtc: window.startsAtUtc,
    endsAtUtc: window.endsAtUtc,
    confidence: page.rewardInference.confidence,
    evidence: page.rewardInference.evidence,
    sourceFile: page.fileName
  )
}

let report = OCRRunReport(
  generatedAt: ISO8601DateFormatter().string(from: Date()),
  inputDirectory: options.inputDirectory,
  modelName: "vision-v1-page-ocr-clan-wars",
  pages: pages,
  recommendedPersonalRewardsWindows: recommendations
)

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]

let data = try encoder.encode(report)
try ensureParentDirectory(for: options.outputPath)
try data.write(to: URL(fileURLWithPath: options.outputPath))

print("Wrote OCR report: \(options.outputPath)")
print("Processed pages: \(pages.count)")
print("Recommended has_personal_rewards windows: \(recommendations.count)")
for rec in recommendations {
  let confidence = String(format: "%.2f", rec.confidence)
  print("- \(rec.startsAtUtc) .. \(rec.endsAtUtc) (file: \(rec.sourceFile), confidence: \(confidence))")
}
