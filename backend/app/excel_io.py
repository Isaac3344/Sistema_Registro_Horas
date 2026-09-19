from __future__ import annotations

from io import BytesIO
from typing import List, Tuple, Optional
from datetime import date, time, datetime

import openpyxl

from .models import WorkLogCreate, LUNCH_MINUTES_ALLOWED

def _norm(s: str) -> str:
    return str(s or "").strip().upper()

def _time_to_minutes(v) -> int:
    if v is None:
        return 0
    if isinstance(v, time):
        return v.hour * 60 + v.minute
    if isinstance(v, datetime):
        return v.hour * 60 + v.minute
    # textos tipo "1 HORA", "30 MIN", "0"
    txt = str(v).strip().lower()
    if not txt:
        return 0
    if "hora" in txt:
        # "1 hora", "1.5 horas"
        num = txt.replace("horas", "").replace("hora", "").strip()
        try:
            h = float(num.replace(",", "."))
            return int(round(h * 60))
        except:
            return 60
    if "min" in txt:
        num = txt.replace("mins", "").replace("min", "").strip()
        try:
            return int(float(num))
        except:
            return 0
    try:
        return int(float(txt))
    except:
        return 0

def _coerce_time(v) -> Optional[time]:
    if v is None:
        return None
    if isinstance(v, time):
        return v
    if isinstance(v, datetime):
        return v.time()
    # strings como "08:30"
    txt = str(v).strip()
    if not txt:
        return None
    try:
        dt = datetime.fromisoformat(f"2000-01-01 {txt}")
        return dt.time()
    except:
        return None

def _find_date_in_sheet(ws) -> Optional[date]:
    # Busca "FECHA:" y toma el valor de la celda a la derecha
    for row in range(1, min(ws.max_row, 30) + 1):
        for col in range(1, min(ws.max_column, 20) + 1):
            v = ws.cell(row, col).value
            if _norm(v) == "FECHA:":
                # busca a la derecha
                for c2 in range(col + 1, col + 10):
                    v2 = ws.cell(row, c2).value
                    if isinstance(v2, datetime):
                        return v2.date()
                    if isinstance(v2, date):
                        return v2
    return None

def _find_header_row(ws) -> Optional[int]:
    # Encuentra la fila donde está "NOMBRE" y "ENTRADA"
    for r in range(1, min(ws.max_row, 60) + 1):
        values = [_norm(ws.cell(r, c).value) for c in range(1, min(ws.max_column, 30) + 1)]
        if "NOMBRE" in values and "ENTRADA" in values and "SALIDA" in values:
            return r
    return None

def parse_excel(content: bytes) -> Tuple[List[WorkLogCreate], List[str]]:
    buf = BytesIO(content)
    wb = openpyxl.load_workbook(buf, data_only=True)

    records: List[WorkLogCreate] = []
    errors: List[str] = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]

        sheet_date = _find_date_in_sheet(ws)
        header_row = _find_header_row(ws)

        if not sheet_date or not header_row:
            # hoja que no corresponde (o vacía)
            continue

        # Mapa de columnas por nombre
        header_map = {}
        for c in range(1, ws.max_column + 1):
            key = _norm(ws.cell(header_row, c).value)
            if key:
                header_map[key] = c

        col_name = header_map.get("NOMBRE")
        col_entry = header_map.get("ENTRADA")
        col_exit  = header_map.get("SALIDA")
        col_lunch = header_map.get("HORA ALMUERZO")
        col_cc    = header_map.get("OBRA/CENTRO DE COSTO") or header_map.get("CENTRO DE COSTO")
        col_obs   = header_map.get("OBSERVACIONES") or header_map.get("DESCRIPCION") or header_map.get("DESCRIPCIÓN")

        if not col_name:
            continue

        # data empieza debajo del header
        for r in range(header_row + 1, ws.max_row + 1):
            name = ws.cell(r, col_name).value
            if name is None or str(name).strip() == "":
                # corta cuando ya no hay nombres (evita leer basura)
                continue

            worker_name = str(name).strip()

            entry_time = _coerce_time(ws.cell(r, col_entry).value) if col_entry else None
            exit_time  = _coerce_time(ws.cell(r, col_exit).value) if col_exit else None

            lunch_raw = ws.cell(r, col_lunch).value if col_lunch else None
            lunch_minutes = _time_to_minutes(lunch_raw)

            # normaliza almuerzo a valores permitidos (redondeo)
            if lunch_minutes in (59, 61):
                lunch_minutes = 60
            if lunch_minutes in (29, 31):
                lunch_minutes = 30
            if lunch_minutes in (89, 91):
                lunch_minutes = 90
            if lunch_minutes in (119, 121):
                lunch_minutes = 120

            if lunch_minutes not in LUNCH_MINUTES_ALLOWED:
                # si viene raro, lo dejamos en 0 para no romper import
                lunch_minutes = 0

            cost_center = ""
            if col_cc:
                vcc = ws.cell(r, col_cc).value
                cost_center = "" if vcc is None else str(vcc).strip()

            description = ""
            if col_obs:
                vobs = ws.cell(r, col_obs).value
                description = "" if vobs is None else str(vobs).strip()

            try:
                rec = WorkLogCreate(
                    worker_name=worker_name,
                    work_date=sheet_date,
                    entry_time=entry_time,
                    exit_time=exit_time,
                    lunch_minutes=lunch_minutes,
                    cost_center=cost_center,
                    description=description,
                )
                records.append(rec)
            except Exception as e:
                errors.append(f"[{sheet_name}] fila {r}: {e}")

    return records, errors


# Export igual que antes si ya te funciona (si quieres lo mejoro después)
def export_excel(rows: list[dict]) -> bytes:
    import pandas as pd
    df = pd.DataFrame(rows)
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="registros")
    return buf.getvalue()
