from __future__ import annotations

from datetime import date, datetime
from typing import Optional, Iterable, Tuple, Dict, List

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import tuple_

from .config import settings
from .db import engine, init_db
from .models import WorkLog, WorkLogCreate, WorkLogRead, WorkLogUpdate, compute_total_minutes
from .excel_io import parse_excel, export_excel
from .pdf_io import export_pdf

app = FastAPI(title="APP REGISTRO - API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

def fmt_time(t) -> str:
    if not t:
        return ""
    return t.strftime("%H:%M")

def to_read_model(w: WorkLog) -> WorkLogRead:
    total_minutes = compute_total_minutes(w.entry_time, w.exit_time, w.lunch_minutes)
    return WorkLogRead(
        id=w.id,
        worker_name=w.worker_name,
        work_date=w.work_date,
        entry_time=w.entry_time,
        exit_time=w.exit_time,
        lunch_minutes=w.lunch_minutes,
        cost_center=w.cost_center,
        description=w.description,
        created_at=w.created_at,
        updated_at=w.updated_at,
        total_minutes=total_minutes,
    )

def _key(name: str, d: date) -> Tuple[str, date]:
    return (name.strip(), d)

def _fetch_existing_map(session: Session, keys: Iterable[Tuple[str, date]]) -> Dict[Tuple[str, date], WorkLog]:
    keys = list(keys)
    if not keys:
        return {}
    rows = session.exec(
        select(WorkLog).where(tuple_(WorkLog.worker_name, WorkLog.work_date).in_(keys))
    ).all()
    return { _key(r.worker_name, r.work_date): r for r in rows }

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/records", response_model=list[WorkLogRead])
def list_records(
    worker_name: Optional[str] = Query(default=None, description="Filtro por nombre (contiene)"),
    work_date: Optional[date] = Query(default=None, description="Filtro por fecha exacta (YYYY-MM-DD)"),
    cost_center: Optional[str] = Query(default=None, description="Filtro por centro de costo (contiene)"),
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
):
    with Session(engine) as session:
        # ✅ ORDEN: Nombre -> Fecha (más reciente primero dentro del nombre)
        stmt = select(WorkLog).order_by(WorkLog.worker_name.asc(), WorkLog.work_date.desc())

        if worker_name:
            stmt = stmt.where(WorkLog.worker_name.ilike(f"%{worker_name.strip()}%"))
        if work_date:
            stmt = stmt.where(WorkLog.work_date == work_date)
        if cost_center:
            stmt = stmt.where(WorkLog.cost_center.ilike(f"%{cost_center.strip()}%"))

        rows = session.exec(stmt.offset(offset).limit(limit)).all()
        return [to_read_model(r) for r in rows]

@app.post("/records", response_model=WorkLogRead)
def create_record(payload: WorkLogCreate):
    with Session(engine) as session:
        obj = WorkLog(**payload.model_dump())
        obj.updated_at = datetime.utcnow()
        session.add(obj)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            raise HTTPException(status_code=409, detail="Ya existe un registro para ese trabajador en esa fecha.")
        session.refresh(obj)
        return to_read_model(obj)

@app.put("/records/{record_id}", response_model=WorkLogRead)
def update_record(record_id: int, payload: WorkLogUpdate):
    with Session(engine) as session:
        obj = session.get(WorkLog, record_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(obj, k, v)

        obj.updated_at = datetime.utcnow()
        session.add(obj)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            raise HTTPException(status_code=409, detail="Ese cambio crearía un duplicado (mismo trabajador y fecha).")
        session.refresh(obj)
        return to_read_model(obj)

@app.delete("/records/{record_id}")
def delete_record(record_id: int):
    with Session(engine) as session:
        obj = session.get(WorkLog, record_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        session.delete(obj)
        session.commit()
        return {"deleted": True}

# ✅ IMPORT PRINCIPAL: UPSERT (no duplica, rápido)
@app.post("/records/import-excel")
async def import_excel_upsert(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Sube un archivo Excel (.xlsx o .xls)")

    content = await file.read()
    try:
        records, errors = parse_excel(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    inserted = 0
    updated = 0
    total = len(records)

    with Session(engine) as session:
        key_list = [_key(r.worker_name, r.work_date) for r in records]
        existing_map = _fetch_existing_map(session, key_list)

        for rec in records:
            k = _key(rec.worker_name, rec.work_date)
            existing = existing_map.get(k)

            if existing:
                existing.entry_time = rec.entry_time
                existing.exit_time = rec.exit_time
                existing.lunch_minutes = rec.lunch_minutes
                existing.cost_center = rec.cost_center
                existing.description = rec.description
                existing.updated_at = datetime.utcnow()
                session.add(existing)
                updated += 1
            else:
                obj = WorkLog(**rec.model_dump())
                obj.updated_at = datetime.utcnow()
                session.add(obj)
                inserted += 1

        session.commit()

    return {"total": total, "inserted": inserted, "updated": updated, "errors": errors}

# ✅ IMPORT ALTERNATIVO: SOLO INSERTA (si existe, lo salta) - rápido
@app.post("/records/import-excel-no-update")
async def import_excel_insert_only(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Sube un archivo Excel (.xlsx o .xls)")

    content = await file.read()
    try:
        records, errors = parse_excel(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    inserted = 0
    skipped = 0
    total = len(records)

    with Session(engine) as session:
        key_list = [_key(r.worker_name, r.work_date) for r in records]
        existing_map = _fetch_existing_map(session, key_list)

        for rec in records:
            k = _key(rec.worker_name, rec.work_date)
            if k in existing_map:
                skipped += 1
                continue

            obj = WorkLog(**rec.model_dump())
            obj.updated_at = datetime.utcnow()
            session.add(obj)
            inserted += 1

        session.commit()

    return {"total": total, "inserted": inserted, "skipped": skipped, "errors": errors}

@app.get("/records/export-excel")
def export_records_excel(
    worker_name: Optional[str] = None,
    work_date: Optional[date] = None,
    cost_center: Optional[str] = None,
):
    with Session(engine) as session:
        stmt = select(WorkLog).order_by(WorkLog.worker_name.asc(), WorkLog.work_date.desc())
        if worker_name:
            stmt = stmt.where(WorkLog.worker_name.ilike(f"%{worker_name.strip()}%"))
        if work_date:
            stmt = stmt.where(WorkLog.work_date == work_date)
        if cost_center:
            stmt = stmt.where(WorkLog.cost_center.ilike(f"%{cost_center.strip()}%"))
        rows = session.exec(stmt).all()

    export_rows = []
    for r in rows:
        total_minutes = compute_total_minutes(r.entry_time, r.exit_time, r.lunch_minutes)
        export_rows.append({
            "worker_name": r.worker_name,
            "work_date": r.work_date.isoformat(),
            "entry_time": fmt_time(r.entry_time),
            "exit_time": fmt_time(r.exit_time),
            "lunch_minutes": r.lunch_minutes,
            "cost_center": r.cost_center,
            "description": r.description,
            "total_hours": round(total_minutes / 60.0, 2),
        })

    content = export_excel(export_rows)
    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=registros.xlsx"},
    )

@app.get("/records/export-pdf")
def export_records_pdf(
    worker_name: Optional[str] = None,
    work_date: Optional[date] = None,
    cost_center: Optional[str] = None,
):
    with Session(engine) as session:
        stmt = select(WorkLog).order_by(WorkLog.worker_name.asc(), WorkLog.work_date.desc())
        if worker_name:
            stmt = stmt.where(WorkLog.worker_name.ilike(f"%{worker_name.strip()}%"))
        if work_date:
            stmt = stmt.where(WorkLog.work_date == work_date)
        if cost_center:
            stmt = stmt.where(WorkLog.cost_center.ilike(f"%{cost_center.strip()}%"))
        rows = session.exec(stmt).all()

    export_rows = []
    for r in rows:
        total_minutes = compute_total_minutes(r.entry_time, r.exit_time, r.lunch_minutes)
        export_rows.append({
            "worker_name": r.worker_name,
            "work_date": r.work_date.isoformat(),
            "entry_time": fmt_time(r.entry_time),
            "exit_time": fmt_time(r.exit_time),
            "lunch_minutes": r.lunch_minutes,
            "cost_center": r.cost_center,
            "description": r.description,
            "total_hours": round(total_minutes / 60.0, 2),
        })

    content = export_pdf(export_rows)
    return Response(
        content,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=registros.pdf"},
    )
