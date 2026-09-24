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
    # Si el rol es employee/viewer, se bloquea la escritura
    if user and getattr(user, "role", "admin") == "employee":
        raise HTTPException(status_code=403, detail="Acceso denegado: este usuario es de solo lectura.")

app = FastAPI(title="API Multiusuario Segura con JWT y Roles por Cédula")

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

# Saneamiento y actualización automática de columnas en BD Neon
try:
    models.Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS cedula VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'admin';"))
            conn.commit()
        except Exception:
            pass
except Exception:
    pass

@app.get("/")
def read_root():
    return {"status": "online", "message": "API JWT Segura activa con validación estricta de Cédula"}

@app.post("/register")
def register(credentials: Dict[str, str], db: Session = Depends(get_db)):
    username = credentials.get("username", "").strip()
    password = credentials.get("password", "").strip()
    cedula = credentials.get("cedula", "").strip()
    role = credentials.get("role", "admin").strip() # 'admin' o 'employee'

    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña requeridos")

    if role == "employee" and not cedula:
        raise HTTPException(status_code=400, detail="La cédula es obligatoria para cuentas de empleado")

    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    # Crear usuario con rol y cédula
    new_user = models.User(
        username=username, 
        password=password, 
        hashed_password=password,
        cedula=cedula if role == "employee" else None,
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.id})
    return {"id": new_user.id, "username": new_user.username, "role": new_user.role, "cedula": new_user.cedula, "token": access_token}

@app.post("/login")
def login(credentials: Dict[str, str], db: Session = Depends(get_db)):
    username = credentials.get("username", "").strip()
    password = credentials.get("password", "").strip()

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="El usuario no existe")

    if (user.password or user.hashed_password) != password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    access_token = create_access_token(data={"sub": user.id})
    return {"id": user.id, "username": user.username, "role": getattr(user, "role", "admin"), "cedula": getattr(user, "cedula", ""), "token": access_token}

@app.get("/records")
def get_records(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        current_user = db.query(models.User).filter(models.User.id == user_id).first()
        admin_user = db.query(models.User).filter(models.User.role == "admin").order_by(models.User.id.asc()).first()
        admin_id = admin_user.id if admin_user else user_id

        user_role = getattr(current_user, "role", "admin")
        user_cedula = getattr(current_user, "cedula", "")

        # Si es empleado, filtramos estrictamente por su cédula registrada
        if user_role == "employee" and user_cedula:
            records = db.query(models.Record).filter(
                models.Record.user_id == admin_id,
                models.Record.cost_center.ilike(f"%{user_cedula}%")
            ).order_by(models.Record.id.desc()).all()
            return records
        else:
            # Si es admin, ve todos sus registros
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