from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    worker_name = Column(String, nullable=False)
    work_date = Column(String, nullable=False)
    entry_time = Column(String, nullable=False)
    exit_time = Column(String, nullable=False)
    lunch_break = Column(String, nullable=False)
    cost_center = Column(String, default="")
    description = Column(String, default="")
    calculated_hours = Column(Float, default=0.0)