"""
SQLAlchemy ORM models.
These map directly to the concepts in the workflow document:
MaintenanceTask (from TMS/SMMS/TDMS), BlockSection (Spatial Harmonization node),
BlockSchedule (optimizer output), PossessionToken (digital T/351 replacement),
OverrideLog (human audit trail).
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class BlockSection(Base):
    """ A node in the Spatial Harmonization Layer. One row = one physical
    section of track that Civil / TRD / S&T all separately have IDs for. """
    __tablename__ = "block_sections"

    id = Column(String, primary_key=True)          # e.g. "DIV-NGP-342"
    division = Column(String)
    km_start = Column(Float)                        # Civil chainage range
    km_end = Column(Float)
    trd_mast_range = Column(String)                  # e.g. "Mast 47-A to 47-C"
    st_point_ids = Column(String)                    # e.g. "Point 12-L, Relay 4-A"
    trains_per_day = Column(Integer, default=20)     # route density input

    tasks = relationship("MaintenanceTask", back_populates="section")


class MaintenanceTask(Base):
    """ A single maintenance / defect task from TMS, SMMS, or TDMS. """
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(String, ForeignKey("block_sections.id"))
    department = Column(String)          # "Civil" | "TRD" | "S&T"
    defect_code = Column(String)         # "IMR" | "REM" | "OBS" | "KAVACH" | "OHE" | "ROUTINE"
    raw_asset_id = Column(String)        # the department-native ID, e.g. "km 342.4" or "Mast 47-B"
    age_or_tonnage = Column(Float)       # t in the Weibull formula
    days_overdue = Column(Integer, default=0)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)

    # computed / cached scoring fields (filled by weibull_engine)
    safety_weight = Column(Float, default=0)
    route_density_score = Column(Float, default=0)
    weibull_urgency = Column(Float, default=0)
    weather_modifier = Column(Float, default=1.0)
    priority_score = Column(Float, default=0)
    predicted_days_to_failure = Column(Float, default=0)

    section = relationship("BlockSection", back_populates="tasks")


class BlockSchedule(Base):
    """ Optimizer output - one scheduled block window. Multiple tasks (even
    from different departments) can share one BlockSchedule row - that IS
    the integrated shadow block. """
    __tablename__ = "block_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(String, ForeignKey("block_sections.id"))
    task_ids = Column(String)            # comma-separated task ids grouped into this block
    departments = Column(String)         # comma-separated departments involved
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    horizon = Column(String)             # "strategic" | "tactical" | "emergency"
    is_shadow_block = Column(Boolean, default=False)
    disruption_score = Column(Float, default=0)
    token_status = Column(String, default="pending")  # pending | approved | rejected


class OverrideLog(Base):
    """ Human override / audit trail entries. """
    __tablename__ = "override_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    block_id = Column(Integer, ForeignKey("block_schedules.id"))
    user_name = Column(String)
    action = Column(String)   # "approved" | "rejected" | "deferred" | "escalated"
    reason = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
