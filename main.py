from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from executor import run_quantum_code_locally
from typing import Any, List
import json
import time

# --- DATABASE SETUP (SQLite) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./quantum_platform.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# --- DATABASE MODEL ---
class SubmissionDB(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_code = Column(Text, nullable=False)
    status = Column(String, default="Pending")
    result_data = Column(Text, nullable=True)
    execution_time = Column(Float, nullable=True)
    noise_level = Column(Float, default=0.0)

Base.metadata.create_all(bind=engine)

# --- API MODELS ---
class CodeSubmission(BaseModel):
    code: str
    framework: str 
    noise_level: float = 0.0

class SubmissionResponse(BaseModel):
    id: int
    status: str
    message: str
    output: Any | None = None
    error: str | None = None

class AlgorithmInfo(BaseModel):
    id: str
    title: str
    description: str
    expected_output_type: str
    code: str

# --- MOCK DATABASE FOR EDUCATIONAL CONTENT ---
# In a production app, this could be its own SQL table. 
# For now, a dictionary is perfectly efficient.
ALGORITHMS_DB = [
    {
        "id": "ghz_state",
        "title": "GHZ State (Entanglement)",
        "description": "Creates a completely entangled state across 3 qubits. Measuring one qubit instantly determines the state of the others, a phenomenon Einstein called 'spooky action at a distance'.",
        "expected_output_type": "histogram",
        "code": "import cirq\nimport json\n\nnoise = PLATFORM_NOISE_LEVEL\nq = cirq.LineQubit.range(3)\n\ncircuit = cirq.Circuit(\n    cirq.H(q[0]),\n    cirq.CNOT(q[0], q[1]),\n    cirq.CNOT(q[1], q[2])\n)\n\nif noise > 0:\n    circuit.append(cirq.depolarize(noise).on_each(*q))\n\ncircuit.append(cirq.measure(*q, key='m'))\n\nresult = cirq.Simulator().run(circuit, repetitions=1000)\ncounts = result.histogram(key='m')\nformatted = {f'{k:03b}': v for k, v in counts.items()}\n\n# Wrap in our new platform standard JSON format\nprint(json.dumps({\"type\": \"histogram\", \"data\": formatted}))"
    },
    {
        "id": "bloch_superposition",
        "title": "Bloch Sphere Representation",
        "description": "Visualizes the state of a single qubit before measurement. We apply a Hadamard gate (to put it in superposition) and a T-gate (to rotate its phase), then extract the 3D coordinates.",
        "expected_output_type": "bloch",
        "code": "import cirq\nimport json\n\nq = cirq.LineQubit(0)\n# Put qubit in superposition and rotate its phase\ncircuit = cirq.Circuit(\n    cirq.H(q),\n    cirq.T(q)\n)\n\n# To draw a Bloch sphere, we simulate the state vector, NOT a measurement\nsimulator = cirq.Simulator()\nresult = simulator.simulate(circuit)\nstate = result.final_state_vector\n\n# Calculate Bloch sphere coordinates (x, y, z)\nbloch_vector = cirq.bloch_vector_from_state_vector(state, 0)\n\noutput = {\n    \"type\": \"bloch\",\n    \"data\": {\n        \"x\": float(bloch_vector[0]),\n        \"y\": float(bloch_vector[1]),\n        \"z\": float(bloch_vector[2])\n    }\n}\nprint(json.dumps(output))"
    },
    {
        "id": "grovers_search",
        "title": "Grover's Search Algorithm",
        "description": "A quantum algorithm that searches an unsorted database exponentially faster than a classical computer. This example searches a 2-qubit system for the state |11>.",
        "expected_output_type": "histogram",
        "code": "import cirq\nimport json\n\nq0, q1 = cirq.LineQubit.range(2)\ncircuit = cirq.Circuit()\n\n# 1. Initialization (Superposition)\ncircuit.append([cirq.H(q0), cirq.H(q1)])\n\n# 2. The Oracle (Tags the |11> state by flipping its sign)\ncircuit.append(cirq.CZ(q0, q1))\n\n# 3. The Diffuser (Amplifies the tagged state)\ncircuit.append([\n    cirq.H(q0), cirq.H(q1),\n    cirq.Z(q0), cirq.Z(q1),\n    cirq.CZ(q0, q1),\n    cirq.H(q0), cirq.H(q1)\n])\n\ncircuit.append(cirq.measure(q0, q1, key='result'))\n\nresult = cirq.Simulator().run(circuit, repetitions=1000)\ncounts = result.histogram(key='result')\nformatted = {f'{k:02b}': v for k, v in counts.items()}\n\nprint(json.dumps({\"type\": \"histogram\", \"data\": formatted}))"
    }
]

# --- FASTAPI APP ---
app = FastAPI(title="Quantum Cloud Platform API")

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

# --- EDUCATIONAL ENDPOINTS ---
@app.get("/api/algorithms", response_model=List[AlgorithmInfo])
def get_all_algorithms():
    """Returns the list of algorithms for the 'Learn' page."""
    return ALGORITHMS_DB

@app.get("/api/algorithms/{algo_id}", response_model=AlgorithmInfo)
def get_algorithm(algo_id: str):
    """Returns a specific algorithm's code to load into the IDE."""
    for algo in ALGORITHMS_DB:
        if algo["id"] == algo_id:
            return algo
    raise HTTPException(status_code=404, detail="Algorithm not found")

# --- EXECUTION ENDPOINT ---
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
        new_submission.result_data = json.dumps(execution_result["output"]) if isinstance(execution_result["output"], dict) else str(execution_result["output"])
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
        "error": execution_result["error"] if not execution_result["success"] else None
    }