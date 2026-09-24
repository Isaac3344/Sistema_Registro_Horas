from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    records = relationship("Record", back_populates="owner")

class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    worker_name = Column(String, nullable=False)
    work_date = Column(String, nullable=False)
    entry_time = Column(String, nullable=False)
    exit_time = Column(String, nullable=False)
    calculated_hours = Column(Float, nullable=False)
    cost_center = Column(String, nullable=True)
    description = Column(String, nullable=True)
    
    # Vinculación exclusiva al usuario
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="records")