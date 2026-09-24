import jwt
import traceback
from datetime import datetime, timedelta
from typing import Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from database import engine, get_db

SECRET_KEY = "tu_clave_secreta_super_segura_cambiala_en_produccion"
ALGORITHM = "HS256"
security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado. Inicia sesión nuevamente.")
    except Exception:
        raise HTTPException(status_code=401, detail="No autorizado")

def verify_write_permission(user_id: int, db: Session):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    role = getattr(user, "role", "admin") if user else "admin"
    if role == "employee":
        raise HTTPException(status_code=403, detail="Acceso denegado: este usuario es de solo lectura.")

app = FastAPI(title="API Multiusuario Segura con JWT y Roles")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled Exception: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error en servidor: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

try:
    models.Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS cedula VARCHAR;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'admin';"))
        conn.commit()
except Exception as e:
    print(f"Nota BD: {e}")

@app.get("/")
def read_root():
    return {"status": "online", "message": "API Segura activa"}

@app.post("/register")
def register(credentials: Dict[str, Any], db: Session = Depends(get_db)):
    username = str(credentials.get("username") or "").strip()
    password = str(credentials.get("password") or "").strip()
    cedula = str(credentials.get("cedula") or "").strip()
    role = str(credentials.get("role") or "admin").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña requeridos")

    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    new_user = models.User(username=username, password=password, hashed_password=password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    try:
        with engine.connect() as conn:
            conn.execute(text("UPDATE users SET role = :role, cedula = :cedula WHERE id = :id"), 
                         {"role": role, "cedula": cedula if role == "employee" else None, "id": new_user.id})
            conn.commit()
    except Exception:
        pass

    access_token = create_access_token(data={"sub": new_user.id})
    return {"id": new_user.id, "username": new_user.username, "role": role, "cedula": cedula, "token": access_token}

@app.post("/login")
def login(credentials: Dict[str, Any], db: Session = Depends(get_db)):
    username = str(credentials.get("username") or "").strip()
    password = str(credentials.get("password") or "").strip()

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="El usuario no existe")

    if (user.password or user.hashed_password) != password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    user_role = getattr(user, "role", "admin") or "admin"
    user_cedula = getattr(user, "cedula", "") or ""

    access_token = create_access_token(data={"sub": user.id})
    return {"id": user.id, "username": user.username, "role": user_role, "cedula": user_cedula, "token": access_token}

# Endpoint para listar usuarios creados (para el panel del administrador)
@app.get("/users")
def get_users(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        users = db.query(models.User).all()
        return [{"id": u.id, "username": u.username, "role": getattr(u, "role", "admin"), "cedula": getattr(u, "cedula", "-")} for u in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/records")
def get_records(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        current_user = db.query(models.User).filter(models.User.id == user_id).first()
        admin_user = db.query(models.User).filter(models.User.role == "admin").order_by(models.User.id.asc()).first()
        admin_id = admin_user.id if admin_user else user_id

        user_role = getattr(current_user, "role", "admin") if current_user else "admin"
        user_cedula = getattr(current_user, "cedula", "") if current_user else ""

        if user_role == "employee" and user_cedula:
            records = db.query(models.Record).filter(
                models.Record.cost_center.ilike(f"%{user_cedula}%")
            ).order_by(models.Record.id.desc()).all()
            return records
        else:
            return db.query(models.Record).filter(models.Record.user_id == user_id).order_by(models.Record.id.desc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/records")
def create_record(record_data: Dict[str, Any], user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    verify_write_permission(user_id, db)
    try:
        db_record = models.Record(
            worker_name=str(record_data.get("worker_name") or ""),
            work_date=str(record_data.get("work_date") or ""),
            entry_time=str(record_data.get("entry_time") or ""),
            exit_time=str(record_data.get("exit_time") or ""),
            calculated_hours=float(record_data.get("calculated_hours") or 0.0),
            cost_center=str(record_data.get("cost_center") or ""),
            description=str(record_data.get("description") or ""),
            user_id=user_id
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/records/{record_id}")
def update_record(record_id: int, record_data: Dict[str, Any], user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    verify_write_permission(user_id, db)
    try:
        db_record = db.query(models.Record).filter(models.Record.id == record_id, models.Record.user_id == user_id).first()
        if not db_record:
            raise HTTPException(status_code=404, detail="Registro no encontrado")

        db_record.worker_name = record_data.get("worker_name", db_record.worker_name)
        db_record.work_date = record_data.get("work_date", db_record.work_date)
        db_record.entry_time = record_data.get("entry_time", db_record.entry_time)
        db_record.exit_time = record_data.get("exit_time", db_record.exit_time)
        db_record.calculated_hours = float(record_data.get("calculated_hours", db_record.calculated_hours))
        db_record.cost_center = record_data.get("cost_center", db_record.cost_center)
        db_record.description = record_data.get("description", db_record.description)
        
        db.commit()
        db.refresh(db_record)
        return db_record
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/records/{record_id}")
def delete_record(record_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    verify_write_permission(user_id, db)
    try:
        db_record = db.query(models.Record).filter(models.Record.id == record_id, models.Record.user_id == user_id).first()
        if not db_record:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        db.delete(db_record)
        db.commit()
        return {"message": "Eliminado"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))