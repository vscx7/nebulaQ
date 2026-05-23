# Nebula-Q: A Web-Based Quantum Computing Virtual Environment

Nebula-Q is a comprehensive, highly scalable, and interactive Platform-as-a-Service (PaaS) solution designed to democratize quantum circuit design and execution. By synthesizing modern full-stack web technologies with advanced quantum physics engines, this project significantly reduces the cognitive load associated with quantum algorithm design.

---

## Architectural Overview

The traditional pedagogical landscape of quantum computing is plagued by the "Black Box" phenomenon—opaque local environments that hide the compilation pipeline. Nebula-Q dismantles this by bridging abstract mathematical models with a transparent, cloud-native virtual environment.

### Core Features
* **Interactive IDE:** Graphically design circuits or write raw Python/IBM Qiskit gate-level code directly in the browser via a Monaco Editor component.
* **Real-Time Mathematical Visualization:** Render high-dimensional outputs into comprehensible probability distribution histograms (Recharts) and geometrically accurate SVG-based Bloch spheres.
* **Exact Statevector Simulation:** Built on the IBM Qiskit physics engine, the backend utilizes `Statevector.from_instruction()` to extract mathematically precise complex probability amplitudes without stochastic sampling noise.
* **AST-Based Security Sandbox:** A defense-in-depth security architecture securely sandboxes user scripts through rigorous Abstract Syntax Tree (AST) validation, blocking malicious imports and unauthorized dunder access.
* **Compilation Transparency:** Instantly view intermediate computational artifacts, including OpenQASM 2.0 representations and ASCII circuit diagrams.

---

## Technology Stack

### Frontend (Presentation Tier)
* **Framework:** React.js (v19) via Vite
* **Editor:** Monaco Editor (`@monaco-editor/react`)
* **Data Visualization:** Recharts and Custom SVG Rendering
* **Styling:** CSS Utility Classes

### Backend (Application & Compilation Tier)
* **Framework:** FastAPI (Asynchronous execution via Uvicorn)
* **Physics Engine:** IBM Qiskit
* **Security Layer:** Python `ast` module for structural code analysis
* **Persistence Tier:** SQLite (Lightweight relational logging)

---

## Installation and Deployment

### 1. Backend Setup
Navigate to the project root and install the required dependencies:
```bash
pip install -r requirements.txt