from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"))

    role = relationship("Role", back_populates="users")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    severity = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Optional relationships to roles/users
    created_by_role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    target_role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)

class Infrastructure(Base):
    __tablename__ = "infrastructure"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String) # Bridge, Road, Shelter
    status = Column(String, default="Operational") # Operational, Degraded, Critical
    latitude = Column(Float)
    longitude = Column(Float)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String)
    description = Column(String)
    status = Column(String, default="Unverified") # Unverified, Verified, Escalated, Resolved
    risk_level = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class FieldTask(Base):
    __tablename__ = "field_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="Pending") # Pending, En Route, On Scene, Completed
    priority = Column(String) # High, Medium, Low
