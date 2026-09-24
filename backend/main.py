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
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        role = getattr(user, "role", "admin") if user else "admin"
        if role == "employee":
            raise HTTPException(status_code=403, detail="Acceso denegado: este usuario es de solo lectura.")
    except HTTPException:
        raise
    except Exception:
        pass

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

@app.get("/users")
def get_users(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        users = db.query(models.User).all()
        return [{"id": u.id, "username": u.username, "role": getattr(u, "role", "admin") or "admin", "cedula": getattr(u, "cedula", "-") or "-"} for u in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/records")
def get_records(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        # Consultar el usuario actual de forma segura usando SQL nativo
        user_result = db.execute(text("SELECT id, username, role, cedula FROM users WHERE id = :uid"), {"uid": user_id}).fetchone()
        
        user_role = "admin"
        user_cedula = ""
        if user_result:
            # user_result tiene índices: 0:id, 1:username, 2:role, 3:cedula
            user_role = user_result[2] if len(user_result) > 2 and user_result[2] else "admin"
            user_cedula = user_result[3] if len(user_result) > 3 and user_result[3] else ""

        # Si es empleado, filtramos estrictamente por su cédula en centro de costo
        if user_role == "employee" and user_cedula:
            query = text("""
                SELECT id, worker_name, work_date, entry_time, exit_time, calculated_hours, cost_center, description, user_id 
                FROM records 
                WHERE cost_center ILIKE :cedula 
                ORDER BY id DESC
            """)
            rows = db.execute(query, {"cedula": f"%{user_cedula}%"}).fetchall()
        else:
            # Si es admin, traemos todos los registros
            query = text("""
                SELECT id, worker_name, work_date, entry_time, exit_time, calculated_hours, cost_center, description, user_id 
                FROM records 
                ORDER BY id DESC
            """)
            rows = db.execute(query).fetchall()

        # Mapear los resultados a diccionarios limpios para el frontend
        result_list = []
        for r in rows:
            result_list.append({
                "id": r[0],
                "worker_name": r[1] or "",
                "work_date": r[2] or "",
                "entry_time": r[3] or "",
                "exit_time": r[4] or "",
                "calculated_hours": float(r[5] or 0.0),
                "cost_center": r[6] or "",
                "description": r[7] or "",
                "user_id": r[8] or 1
            })
        return result_list

    except Exception as e:
        print(f"Error crítico en /records: {e}")
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
        db_record = db.query(models.Record).filter(models.Record.id == record_id).first()
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
        db_record = db.query(models.Record).filter(models.Record.id == record_id).first()
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
    
@app.delete("/users/{user_id}")
def delete_user(user_id: int, user_id_auth: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        db.delete(user)
        db.commit()
        return {"message": "Usuario eliminado correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))