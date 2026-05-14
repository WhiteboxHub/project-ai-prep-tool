"""
db/connection.py – Connection pool for remote MySQL.

Uses DBUtils PooledDB so each get_db_connection() call checks out an
already-open, authenticated TCP socket instead of creating a new one.
This removes ~100-500 ms of handshake latency per request.
"""

import os
import pymysql
import pymysql.cursors
from urllib.parse import urlparse, unquote

# ── build kwargs from env ────────────────────────────────────────────────────

def _build_connect_kwargs() -> dict:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        parsed = urlparse(database_url)
        return dict(
            host=parsed.hostname,
            user=unquote(parsed.username or ""),
            password=unquote(parsed.password or ""),
            database=parsed.path.lstrip("/"),
            port=parsed.port or 3306,
        )

    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    db_name = os.getenv("DB_NAME")
    port = int(os.getenv("DB_PORT", 3306))

    if not all([host, user, password, db_name]):
        raise RuntimeError(
            "Database config missing: provide DATABASE_URL or DB_* variables"
        )

    return dict(host=host, user=user, password=password, database=db_name, port=port)


# ── pool (created lazily on first use) ──────────────────────────────────────

_pool = None


def _get_pool():
    global _pool
    if _pool is not None:
        return _pool

    try:
        from dbutils.pooled_db import PooledDB  # type: ignore
    except ImportError:
        # Fallback: DBUtils < 2.0 used a different import path
        from DBUtils.PooledDB import PooledDB  # type: ignore

    kwargs = _build_connect_kwargs()
    _pool = PooledDB(
        creator=pymysql,
        mincached=2,        # keep 2 connections warm at all times
        maxcached=8,        # up to 8 idle connections in the pool
        maxconnections=16,  # hard cap on total open connections
        blocking=True,      # wait instead of raising when all connections busy
        ping=1,             # ping before reuse to detect stale connections
        cursorclass=pymysql.cursors.DictCursor,
        **kwargs,
    )
    return _pool


def get_db_connection():
    """Return a pooled connection. Callers must still call .close() which
    returns the connection to the pool rather than actually closing it."""
    return _get_pool().connection()