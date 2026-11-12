from sqlmodel import SQLModel, create_engine, Session

# Utilizamos SQLite local para garantizar un costo de $0 MXN y alta disponibilidad en Render
sqlite_file_name = "clinica_privada.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# El parámetro check_same_thread es necesario en FastAPI cuando se usa SQLite
engine = create_engine(sqlite_url, echo=True, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session