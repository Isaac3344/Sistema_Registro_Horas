import os
import sys
from pathlib import Path

def ensure_streams():
    # cuando es --noconsole, stdout/stderr pueden ser None
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")

def main():
    ensure_streams()

    # Log a archivo (para ver si se cae)
    log_path = Path.home() / "AppData" / "Local" / "RegistroPersonal"
    log_path.mkdir(parents=True, exist_ok=True)
    log_file = log_path / "backend.log"
    sys.stdout = open(log_file, "a", encoding="utf-8", errors="ignore")
    sys.stderr = sys.stdout

    # ✅ IMPORT REAL (esto obliga a PyInstaller a incluir app/)
    from app.main import app as fastapi_app

    import uvicorn
    uvicorn.run(
        fastapi_app,
        host="127.0.0.1",
        port=8000,
        log_level="warning",
        access_log=False
    )

if __name__ == "__main__":
    main()
