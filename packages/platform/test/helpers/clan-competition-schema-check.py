#!/usr/bin/env python3

import json
import sqlite3
import sys
from pathlib import Path


MIGRATIONS_DIRECTORY = Path.cwd() / "platform" / "migrations"


def apply_migrations() -> sqlite3.Connection:
    connection = sqlite3.connect(":memory:")
    connection.execute("PRAGMA foreign_keys = ON")

    for migration_path in sorted(MIGRATIONS_DIRECTORY.glob("*.sql")):
        connection.executescript(migration_path.read_text(encoding="utf-8"))

    return connection


def last_insert_id(connection: sqlite3.Connection) -> int:
    return int(connection.execute("SELECT last_insert_rowid()").fetchone()[0])


def create_player_profile(connection: sqlite3.Connection, nickname: str) -> int:
    connection.execute(
        "INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)",
        (nickname, "active"),
    )
    return last_insert_id(connection)


def create_report_import(connection: sqlite3.Connection, upload_type: str, scope_key: str) -> int:
    connection.execute(
        " ".join(
            [
                "INSERT INTO report_import",
                "(upload_type, source_kind, scope_type, scope_key, replace_existing, status)",
                "VALUES (?, ?, ?, ?, ?, ?)",
            ]
        ),
        (upload_type, "manual_json", "competition_window", scope_key, 1, "applied"),
    )
    return last_insert_id(connection)


def create_competition_window(
    connection: sqlite3.Connection, activity_type: str, cadence_slot: str, rotation_number: int
) -> int:
    connection.execute(
        " ".join(
            [
                "INSERT INTO competition_window",
                "(activity_type, season_year, week_of_year, cadence_slot, rotation_number, starts_at, ends_at, label)",
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ]
        ),
        (
            activity_type,
            2026,
            18 if activity_type == "hydra" else 19,
            cadence_slot,
            rotation_number,
            "2026-04-22T00:00:00Z" if activity_type == "hydra" else "2026-04-23T00:00:00Z",
            "2026-04-29T00:00:00Z" if activity_type == "hydra" else "2026-04-30T00:00:00Z",
            f"{activity_type}-window",
        ),
    )
    return last_insert_id(connection)


def seed_hydra_context(connection: sqlite3.Connection) -> dict[str, int]:
    competition_window_id = create_competition_window(connection, "hydra", "weekly", 2)
    player_profile_id = create_player_profile(connection, "MiroslavUA")
    report_import_id = create_report_import(connection, "ocr_hydra_detail", "hydra:2026:18")

    connection.execute(
        "INSERT INTO hydra_report (competition_window_id, report_import_id, source_system, is_partial) VALUES (?, ?, ?, ?)",
        (competition_window_id, report_import_id, "ocr_json", 0),
    )
    hydra_report_id = last_insert_id(connection)

    connection.execute(
        " ".join(
            [
                "INSERT INTO hydra_player_result",
                "(hydra_report_id, player_profile_id, display_name_at_import, total_damage, keys_used, clan_rank, data_completeness)",
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
            ]
        ),
        (hydra_report_id, player_profile_id, "MiroslavUA", 1_250_000_000, 3, 1, "full_detail"),
    )
    hydra_player_result_id = last_insert_id(connection)

    return {
        "competitionWindowId": competition_window_id,
        "playerProfileId": player_profile_id,
        "hydraReportId": hydra_report_id,
        "hydraPlayerResultId": hydra_player_result_id,
    }


def seed_chimera_context(connection: sqlite3.Connection) -> dict[str, int]:
    competition_window_id = create_competition_window(connection, "chimera", "weekly", 3)
    player_profile_id = create_player_profile(connection, "Belkins")
    report_import_id = create_report_import(connection, "ocr_chimera_detail", "chimera:2026:19")

    connection.execute(
        "INSERT INTO chimera_report (competition_window_id, report_import_id, source_system, is_partial) VALUES (?, ?, ?, ?)",
        (competition_window_id, report_import_id, "ocr_json", 0),
    )
    chimera_report_id = last_insert_id(connection)

    connection.execute(
        " ".join(
            [
                "INSERT INTO chimera_player_result",
                "(chimera_report_id, player_profile_id, display_name_at_import, total_damage, keys_used, clan_rank, data_completeness)",
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
            ]
        ),
        (chimera_report_id, player_profile_id, "Belkins", 950_000_000, 2, 1, "partial_detail"),
    )
    chimera_player_result_id = last_insert_id(connection)

    return {
        "competitionWindowId": competition_window_id,
        "playerProfileId": player_profile_id,
        "chimeraReportId": chimera_report_id,
        "chimeraPlayerResultId": chimera_player_result_id,
    }


def emit(payload: dict) -> None:
    print(json.dumps(payload))


def run(command: str) -> None:
    connection = apply_migrations()

    if command == "tables":
        tables = [
            row[0]
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
        ]
        emit({"ok": True, "tables": tables})
        return

    if command == "duplicate-window":
        create_competition_window(connection, "hydra", "weekly", 1)
        duplicate_rejected = False
        try:
            create_competition_window(connection, "hydra", "weekly", 2)
        except sqlite3.IntegrityError:
            duplicate_rejected = True
        emit({"ok": True, "duplicateRejected": duplicate_rejected})
        return

    if command == "difficulty-constraints":
        hydra = seed_hydra_context(connection)
        chimera = seed_chimera_context(connection)

        hydra_rejected = False
        chimera_rejected = False

        try:
            connection.execute(
                " ".join(
                    [
                        "INSERT INTO hydra_team_run",
                        "(hydra_player_result_id, hydra_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    ]
                ),
                (
                    hydra["hydraPlayerResultId"],
                    hydra["hydraReportId"],
                    hydra["competitionWindowId"],
                    hydra["playerProfileId"],
                    1,
                    "ultra_nightmare",
                    400_000_000,
                    "full_detail",
                ),
            )
        except sqlite3.IntegrityError:
            hydra_rejected = True

        try:
            connection.execute(
                " ".join(
                    [
                        "INSERT INTO chimera_team_run",
                        "(chimera_player_result_id, chimera_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    ]
                ),
                (
                    chimera["chimeraPlayerResultId"],
                    chimera["chimeraReportId"],
                    chimera["competitionWindowId"],
                    chimera["playerProfileId"],
                    1,
                    "impossible",
                    300_000_000,
                    "partial_detail",
                ),
            )
        except sqlite3.IntegrityError:
            chimera_rejected = True

        connection.execute(
            " ".join(
                [
                    "INSERT INTO chimera_team_run",
                    "(chimera_player_result_id, chimera_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ]
            ),
            (
                chimera["chimeraPlayerResultId"],
                chimera["chimeraReportId"],
                chimera["competitionWindowId"],
                chimera["playerProfileId"],
                1,
                "ultra_nightmare",
                300_000_000,
                "partial_detail",
            ),
        )

        emit({"ok": True, "hydraRejected": hydra_rejected, "chimeraRejected": chimera_rejected})
        return

    if command == "data-completeness":
        hydra = seed_hydra_context(connection)
        invalid_rejected = False

        try:
            connection.execute(
                " ".join(
                    [
                        "INSERT INTO hydra_team_run",
                        "(hydra_player_result_id, hydra_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    ]
                ),
                (
                    hydra["hydraPlayerResultId"],
                    hydra["hydraReportId"],
                    hydra["competitionWindowId"],
                    hydra["playerProfileId"],
                    1,
                    "nightmare",
                    400_000_000,
                    "unknown_state",
                ),
            )
        except sqlite3.IntegrityError:
            invalid_rejected = True

        emit({"ok": True, "invalidRejected": invalid_rejected})
        return

    if command == "roster-summary-unique":
        player_profile_id = create_player_profile(connection, "Radoran")
        connection.execute(
            " ".join(
                [
                    "INSERT INTO champion_roster_observation",
                    "(player_profile_id, champion_code, first_seen_at, last_seen_at, evidence_type, evidence_ref_id)",
                    "VALUES (?, ?, ?, ?, ?, ?)",
                ]
            ),
            (
                player_profile_id,
                "lydia_the_deathsiren",
                "2026-04-22T00:00:00Z",
                "2026-04-22T00:00:00Z",
                "hydra",
                101,
            ),
        )

        duplicate_rejected = False
        try:
            connection.execute(
                " ".join(
                    [
                        "INSERT INTO champion_roster_observation",
                        "(player_profile_id, champion_code, first_seen_at, last_seen_at, evidence_type, evidence_ref_id)",
                        "VALUES (?, ?, ?, ?, ?, ?)",
                    ]
                ),
                (
                    player_profile_id,
                    "lydia_the_deathsiren",
                    "2026-04-23T00:00:00Z",
                    "2026-04-23T00:00:00Z",
                    "chimera",
                    202,
                ),
            )
        except sqlite3.IntegrityError:
            duplicate_rejected = True

        emit({"ok": True, "duplicateRejected": duplicate_rejected})
        return

    print(f"Unknown command: {command}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    try:
        run(sys.argv[1])
    except IndexError:
        print("Missing command", file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
