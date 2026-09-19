from sqlmodel import SQLModel, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy import event

from .config import settings


# ─────────────────────────────────────────────
# Engine SQLite bien configurado
# ─────────────────────────────────────────────
engine: Engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},  # necesario con FastAPI
)


# ─────────────────────────────────────────────
# Activar PRAGMAs útiles en SQLite
# ─────────────────────────────────────────────
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA synchronous = NORMAL;")
    cursor.close()


# ─────────────────────────────────────────────
# Inicializar base de datos
# ─────────────────────────────────────────────
def init_db() -> None:
    """
    Crea las tablas si no existen.
    NO borra datos.
    """
    SQLModel.metadata.create_all(engine)
