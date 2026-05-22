"""SQLite depo — AIRSENSE_DEMO_MODE=true iken Supabase yerine kullanilir."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

DEMO_DEVICE_SERIAL = "AIRSENSE-PRO-001"
DB_PATH = Path(__file__).resolve().parent / "data" / "demo.db"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_demo_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                serial_number TEXT NOT NULL UNIQUE,
                user_id TEXT,
                label TEXT
            );
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_serial TEXT NOT NULL,
                temperature REAL NOT NULL,
                humidity REAL NOT NULL,
                co2_ppm INTEGER,
                voc_index INTEGER,
                mq135_value INTEGER,
                air_quality_status TEXT NOT NULL,
                is_alert INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_readings_serial_created
                ON sensor_readings (device_serial, created_at DESC);
            """
        )
        cur = conn.execute(
            "SELECT id FROM devices WHERE serial_number = ?",
            (DEMO_DEVICE_SERIAL,),
        )
        if cur.fetchone() is None:
            conn.execute(
                "INSERT INTO devices (serial_number, user_id, label) VALUES (?, NULL, ?)",
                (DEMO_DEVICE_SERIAL, "Demo Cihaz"),
            )
        conn.commit()


def insert_reading(kayit: dict[str, Any]) -> dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO sensor_readings (
                device_serial, temperature, humidity, co2_ppm, voc_index,
                mq135_value, air_quality_status, is_alert, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                kayit["device_serial"],
                kayit["temperature"],
                kayit["humidity"],
                kayit.get("co2_ppm"),
                kayit.get("voc_index"),
                kayit.get("mq135_value"),
                kayit["air_quality_status"],
                1 if kayit.get("is_alert") else 0,
                created_at,
            ),
        )
        row_id = cur.lastrowid
        conn.commit()
    return {"id": row_id, "created_at": created_at, **kayit}


def fetch_history(serial_number: str, limit: int = 20) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, temperature, humidity, co2_ppm, voc_index,
                   air_quality_status, created_at
            FROM sensor_readings
            WHERE device_serial = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (serial_number, limit),
        ).fetchall()
    return [_row_to_api(dict(r)) for r in rows]


def fetch_latest(serial_number: str) -> Optional[dict[str, Any]]:
    items = fetch_history(serial_number, limit=1)
    return items[0] if items else None


def _row_to_api(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "temperature": row["temperature"],
        "humidity": row["humidity"],
        "co2_ppm": row.get("co2_ppm"),
        "voc_index": row.get("voc_index"),
        "air_quality_status": row["air_quality_status"],
        "created_at": row["created_at"],
    }
