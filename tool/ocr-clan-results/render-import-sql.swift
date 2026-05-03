#!/usr/bin/env swift

import Foundation

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
  let sourceType: String
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

func sqlString(_ value: String?) -> String {
  guard let value else { return "NULL" }
  let escaped = value.replacingOccurrences(of: "'", with: "''")
  return "'\(escaped)'"
}

func sqlInt(_ value: Int?) -> String {
  value.map(String.init) ?? "NULL"
}

let inputPath = CommandLine.arguments.count > 1
  ? CommandLine.arguments[1]
  : "tool/ocr-clan-results/out/clanwars-canonical-import.json"
let outputPath = CommandLine.arguments.count > 2
  ? CommandLine.arguments[2]
  : "tool/ocr-clan-results/out/clanwars-canonical-import.sql"

let data = try Data(contentsOf: URL(fileURLWithPath: inputPath))
let report = try JSONDecoder().decode(CanonicalClanWarsImportReport.self, from: data)

var sql: [String] = []
sql.append("-- Generated from \(inputPath)")
sql.append("DROP TABLE IF EXISTS _cw_import;")
sql.append("DROP TABLE IF EXISTS _cw_import_players;")
sql.append("")
sql.append("CREATE TABLE _cw_import (")
sql.append("  source_report_key TEXT NOT NULL,")
sql.append("  starts_at TEXT NOT NULL,")
sql.append("  ends_at TEXT NOT NULL,")
sql.append("  has_personal_rewards INTEGER NOT NULL,")
sql.append("  opponent_clan_name TEXT,")
sql.append("  total_mine INTEGER,")
sql.append("  total_opponent INTEGER,")
sql.append("  source_file TEXT NOT NULL")
sql.append(");")
sql.append("")
sql.append("CREATE TABLE _cw_import_players (")
sql.append("  source_report_key TEXT NOT NULL,")
sql.append("  rank INTEGER NOT NULL,")
sql.append("  player_nick TEXT NOT NULL,")
sql.append("  points INTEGER NOT NULL")
sql.append(");")
sql.append("")

for tournament in report.tournaments {
  sql.append(
    "INSERT INTO _cw_import (source_report_key, starts_at, ends_at, has_personal_rewards, opponent_clan_name, total_mine, total_opponent, source_file) VALUES (\(sqlString(tournament.sourceReportKey)), \(sqlString(tournament.startsAt)), \(sqlString(tournament.endsAt)), \(tournament.hasPersonalRewards), \(sqlString(tournament.opponentClanName)), \(sqlInt(tournament.totals.mine)), \(sqlInt(tournament.totals.opponent)), \(sqlString(tournament.sourceFile)));"
  )
}

sql.append("")

for tournament in report.tournaments {
  for player in tournament.playersOurs {
    sql.append(
      "INSERT INTO _cw_import_players (source_report_key, rank, player_nick, points) VALUES (\(sqlString(tournament.sourceReportKey)), \(player.rank), \(sqlString(player.playerNick)), \(player.points));"
    )
  }
}

let output = sql.joined(separator: "\n") + "\n"
try FileManager.default.createDirectory(at: URL(fileURLWithPath: outputPath).deletingLastPathComponent(), withIntermediateDirectories: true)
try output.write(to: URL(fileURLWithPath: outputPath), atomically: true, encoding: .utf8)

print("Wrote SQL: \(outputPath)")
print("Tournaments: \(report.tournaments.count)")
