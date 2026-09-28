"""
Database setup.
Currently SQLite for zero-config prototype running.
To move to Postgres later: change DATABASE_URL below to something like
"postgresql://user:password@host:5432/dbname" and pip install psycopg2-binary.
Nothing else in the codebase needs to change - SQLAlchemy abstracts the rest.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./block_planning.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # only needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
