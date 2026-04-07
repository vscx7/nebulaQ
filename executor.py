import sys
import io
import traceback
import json

def run_quantum_code_locally(code_string: str, noise_level: float = 0.0) -> dict:
    captured_output = io.StringIO()
    original_stdout = sys.stdout
    sys.stdout = captured_output
    
    success = False
    error_message = None
    
    # Define the environment variables we want to expose to the user's code
    # We pass the noise level as a global constant so their script can read it
    exec_globals = {
        "__builtins__": __builtins__,
        "PLATFORM_NOISE_LEVEL": noise_level
    }
    
    try:
        # Run the code with our custom globals
        exec(code_string, exec_globals, {})
        success = True
    except Exception as e:
        error_message = traceback.format_exc()
    finally:
        sys.stdout = original_stdout
        
    raw_output = captured_output.getvalue().strip()
    
    formatted_output = raw_output
    if success and raw_output:
        try:
            formatted_output = json.loads(raw_output)
        except json.JSONDecodeError:
            pass
            
    return {
        "success": success,
        "output": formatted_output,
        "error": error_message
    }