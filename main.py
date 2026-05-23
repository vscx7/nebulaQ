from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from executor import run_quantum_code_locally
from typing import Any, List
import json
import time

SQLALCHEMY_DATABASE_URL = "sqlite:///./quantum_platform.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SubmissionDB(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    user_code = Column(Text, nullable=False)
    status = Column(String, default="Pending")
    result_data = Column(Text, nullable=True)
    execution_time = Column(Float, nullable=True)
    noise_level = Column(Float, default=0.0)

Base.metadata.create_all(bind=engine)

class CodeSubmission(BaseModel):
    code: str
    framework: str = "qiskit"
    noise_level: float = 0.0

class SubmissionResponse(BaseModel):
    id: int
    status: str
    message: str
    output: Any | None = None
    error: str | None = None
    terminal: str | None = None

class AlgorithmInfo(BaseModel):
    id: str
    title: str
    description: str
    expected_output_type: str
    code: str

ALGORITHMS_DB = [
    {
        "id": "bell-state",
        "title": "Bell State (Entanglement)",
        "description": "The foundational two-qubit entangled state. Measuring one qubit instantaneously determines the state of the other.",
        "expected_output_type": "histogram",
        "code": "print('Preparing Bell State...')\nqc.h(0)\nqc.cx(0, 1)\nprint('Entanglement complete!')"
    },
    {
        "id": "ghz_state",
        "title": "GHZ State",
        "description": "Creates a completely entangled state across 3 qubits.",
        "expected_output_type": "histogram",
        "code": "qc.h(0)\nqc.cx(0, 1)\nqc.cx(1, 2)"
    },
    {
        "id": "bloch_superposition",
        "title": "Phase Rotation (Bloch Sphere)",
        "description": "Visualizes a single-qubit pure state on the Bloch Sphere.",
        "expected_output_type": "bloch",
        "code": "qc.h(0)\nqc.t(0)"
    },
    {
        "id": "grovers_search",
        "title": "Grover's Search Algorithm",
        "description": "A quantum algorithm that searches an unsorted database. Searches a 2-qubit system for |11>.",
        "expected_output_type": "histogram",
        "code": "# 1. Initialization\nqc.h(0)\nqc.h(1)\n# 2. Oracle\nqc.cz(0, 1)\n# 3. Diffusion\nqc.h(0)\nqc.h(1)\nqc.z(0)\nqc.z(1)\nqc.cz(0, 1)\nqc.h(0)\nqc.h(1)"
    }
]

app = FastAPI(title="Nebula-Q Compilation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/algorithms", response_model=List[AlgorithmInfo])
def get_all_algorithms():
    return ALGORITHMS_DB

@app.get("/api/algorithms/{algo_id}", response_model=AlgorithmInfo)
def get_algorithm(algo_id: str):
    for algo in ALGORITHMS_DB:
        if algo["id"] == algo_id:
            return algo
    raise HTTPException(status_code=404, detail="Algorithm not found")

@app.post("/submit-code/", response_model=SubmissionResponse)
def submit_quantum_code(submission: CodeSubmission, db: Session = Depends(get_db)):
    new_submission = SubmissionDB(
        user_code=submission.code,
        status="Running",
        noise_level=submission.noise_level
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    start_time = time.time()
    execution_result = run_quantum_code_locally(submission.code, submission.noise_level)
    execution_time_ms = (time.time() - start_time) * 1000

    if execution_result["success"]:
        new_submission.status = "Completed"
        new_submission.result_data = json.dumps(execution_result["output"])
    else:
        new_submission.status = "Failed"
        new_submission.result_data = str(execution_result["error"])

    new_submission.execution_time = execution_time_ms
    db.commit()

    return {
        "id": new_submission.id,
        "status": new_submission.status,
        "message": "Execution finished.",
        "output": execution_result["output"] if execution_result["success"] else None,
        "error": execution_result["error"] if not execution_result["success"] else None,
        "terminal": execution_result["terminal"]
    }