import ast
import re
import sys
import io
import traceback
import numpy as np
from qiskit import QuantumCircuit, qasm2
from qiskit.quantum_info import Statevector

# --- SECURITY VALIDATOR ---
BLOCKED_NAMES = {
    'exec', 'eval', 'compile', 'open', 'input', 'breakpoint', 
    'globals', 'locals', 'vars', 'dir', 'getattr', 'setattr', 'delattr', 
    'hasattr', 'import', 'memoryview', 'bytearray', 'classmethod', 
    'staticmethod', 'property', 'super', 'type', 'help', 'exit', 'quit'
}

def validate_code(code: str):
    if not code or not code.strip():
        raise ValueError("Code cannot be empty")
    try:
        tree = ast.parse(code, mode="exec")
    except SyntaxError as e:
        raise ValueError(f"Syntax error on line {e.lineno}: {e.msg}")

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            raise ValueError("Security Violation: Import statements are blocked.")
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
            raise ValueError("Security Violation: Function/Class definitions are blocked.")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_NAMES:
                raise ValueError(f"Security Violation: '{node.func.id}()' is blocked.")
        elif isinstance(node, ast.Attribute):
            if node.attr.startswith('__') and node.attr.endswith('__'):
                raise ValueError("Security Violation: Dunder attributes are blocked.")

def count_required_qubits(code: str) -> int:
    pattern = r'qc\.\w+\(([^)]*)\)'
    matches = re.findall(pattern, code)
    max_idx = -1
    for match in matches:
        nums = re.findall(r'\d+', match)
        for n in nums:
            max_idx = max(max_idx, int(n))
    num_qubits = max_idx + 1 if max_idx >= 0 else 1
    if num_qubits > 10:
        raise ValueError("Exceeded maximum allowed qubits (10)")
    return num_qubits

def compute_bloch_vector(state: Statevector) -> dict:
    alpha = state.data[0]
    beta = state.data[1]
    product = alpha * np.conj(beta)
    return {
        "x": round(float(2.0 * np.real(product)), 8),
        "y": round(float(2.0 * np.imag(product)), 8),
        "z": round(float(np.abs(alpha)**2 - np.abs(beta)**2), 8)
    }

def run_quantum_code_locally(code_string: str, noise_level: float = 0.0) -> dict:
    # Capture standard output for the Terminal feature
    captured_output = io.StringIO()
    original_stdout = sys.stdout
    sys.stdout = captured_output
    
    terminal_logs = ""
    error_msg = None
    output_data = None
    success = False

    try:
        validate_code(code_string)
        num_qubits = count_required_qubits(code_string)
        qc = QuantumCircuit(num_qubits)
        
        # Execute sandbox
        exec_globals = {"__builtins__": {"print": print}, "qc": qc}
        exec(code_string, exec_globals, {})
        
        state = Statevector.from_instruction(qc)
        raw_probs = state.probabilities_dict()
        
        # Apply simulated depolarizing noise
        probabilities = {}
        if noise_level > 0:
            num_states = 2 ** num_qubits
            for k, v in raw_probs.items():
                noisy_prob = (v * (1.0 - noise_level)) + (noise_level / num_states)
                if noisy_prob > 1e-15:
                    probabilities[k] = round(noisy_prob, 10)
        else:
            probabilities = {k: round(v, 10) for k, v in raw_probs.items() if v > 1e-15}
            
        try:
            qasm = qasm2.dumps(qc)
        except Exception:
            qasm = qc.qasm()
            
        circuit_diagram = str(qc.draw(output="text"))
        
        bloch_vector = None
        if num_qubits == 1:
            bloch_vector = compute_bloch_vector(state)
            result_type = "bloch"
        else:
            result_type = "histogram"
            
        output_data = {
            "type": result_type,
            "data": bloch_vector if result_type == "bloch" else probabilities,
            "probabilities": probabilities,
            "qasm": qasm,
            "circuit_diagram": circuit_diagram,
            "num_qubits": num_qubits
        }
        success = True
        
    except Exception as e:
        # Format the traceback to show the user's line of code
        exc_type, exc_value, exc_traceback = sys.exc_info()
        tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
        user_tb = [line for line in tb_lines if '<string>' in line or line.startswith(exc_type.__name__)]
        error_msg = "".join(user_tb) if user_tb else str(e)
        
    finally:
        sys.stdout = original_stdout
        terminal_logs = captured_output.getvalue()

    return {
        "success": success,
        "output": output_data,
        "error": error_msg,
        "terminal": terminal_logs
    }