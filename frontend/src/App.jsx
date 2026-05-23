import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, AlertCircle, Server, BookOpen, Code, Library, Home, ArrowRight, Lightbulb, Shield, Zap, FileTerminal, Cpu, Terminal, HelpCircle, Settings, Activity } from 'lucide-react';

const BlochSphere = ({ x, y, z }) => {
  const scale = 100;
  const cx = 150;
  const cy = 150;
  const projX = cx + (y * scale) - (x * scale * 0.5);
  const projY = cy - (z * scale) + (x * scale * 0.3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <svg width="300" height="300" viewBox="0 0 300 300" style={{ filter: 'drop-shadow(0px 0px 15px rgba(59, 130, 246, 0.3))' }}>
        <circle cx={cx} cy={cy} r={scale} fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" opacity="0.8" />
        <ellipse cx={cx} cy={cy} rx={scale} ry={scale * 0.3} fill="none" stroke="#475569" strokeDasharray="4,4" />
        <line x1={cx} y1={cy - scale} x2={cx} y2={cy + scale} stroke="#475569" strokeDasharray="3,3" />
        <text x={cx - 15} y={cy - scale - 5} fill="#94a3b8" fontSize="14" fontWeight="bold">|0⟩</text>
        <text x={cx - 15} y={cy + scale + 15} fill="#94a3b8" fontSize="14" fontWeight="bold">|1⟩</text>
        <line x1={cx - scale} y1={cy} x2={cx + scale} y2={cy} stroke="#475569" strokeDasharray="3,3" />
        <text x={cx + scale + 5} y={cy + 5} fill="#10b981" fontSize="14" fontWeight="bold">Y</text>
        <line x1={cx - scale*0.7} y1={cy + scale*0.5} x2={cx + scale*0.7} y2={cy - scale*0.5} stroke="#475569" strokeDasharray="3,3" />
        <text x={cx - scale*0.7 - 15} y={cy + scale*0.5 + 10} fill="#ef4444" fontSize="14" fontWeight="bold">X</text>
        <line x1={cx} y1={cy} x2={projX} y2={projY} stroke="#8b5cf6" strokeWidth="4" markerEnd="url(#arrowhead)" />
        <circle cx={projX} cy={projY} r="5" fill="#c4b5fd" style={{ filter: 'drop-shadow(0px 0px 8px #8b5cf6)' }} />
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
          </marker>
        </defs>
      </svg>
      <div style={{ marginTop: '15px', color: '#cbd5e1', fontFamily: 'monospace', backgroundColor: '#1e293b', padding: '8px 20px', borderRadius: '20px', border: '1px solid #334155' }}>
        X: {x.toFixed(3)} | Y: {y.toFixed(3)} | Z: {z.toFixed(3)}
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [algorithms, setAlgorithms] = useState([]);
  
  const [code, setCode] = useState("print('Initializing quantum circuit...')\nqc.h(0)\nqc.cx(0, 1)\nprint('Entanglement sequence applied.')\n");
  const [noiseLevel, setNoiseLevel] = useState(0.0);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  
  const [resultType, setResultType] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [qasm, setQasm] = useState(null);
  const [circuitDiagram, setCircuitDiagram] = useState(null);
  const [numQubits, setNumQubits] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/algorithms')
      .then(res => res.json())
      .then(data => setAlgorithms(data))
      .catch(err => console.error("Failed to load algorithms", err));
  }, []);

  const loadAlgorithmToIDE = (algoCode) => {
    setCode(algoCode);
    setActiveTab('ide');
    setChartData(null);
    setResultType(null);
    setErrorMessage(null);
    setTerminalOutput("");
    setQasm(null);
    setCircuitDiagram(null);
  };

  const runSimulation = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    setTerminalOutput("");
    setChartData(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/submit-code/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, framework: 'qiskit', noise_level: parseFloat(noiseLevel) }),
      });

      const data = await response.json();
      
      if (data.terminal) setTerminalOutput(data.terminal);

      if (data.status === 'Completed' && data.output) {
        setResultType(data.output.type);
        setQasm(data.output.qasm);
        setCircuitDiagram(data.output.circuit_diagram);
        setNumQubits(data.output.num_qubits);
        
        if (data.output.type === 'histogram') {
          const formattedData = Object.entries(data.output.data).map(([state, prob]) => ({
            state: `|${state}⟩`, prob: (prob * 100).toFixed(1) 
          }));
          setChartData(formattedData);
        } else if (data.output.type === 'bloch') {
          setChartData(data.output.data); 
        }
      } else {
        setErrorMessage(data.error || "Execution error.");
      }
    } catch (err) {
      setErrorMessage("Failed to connect to backend. Is the FastAPI server running?");
    } finally {
      setIsRunning(false);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #3b82f6', padding: '10px', borderRadius: '5px', color: 'white' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>State: {payload[0].payload.state}</p>
          <p style={{ margin: 0, color: '#60a5fa' }}>Probability: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: '"Inter", system-ui, sans-serif' }}>
      
      {/* GLOBAL NAVBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 40px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
          <div style={{ padding: '8px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #3b82f6' }}>
            <Server size={22} color="#60a5fa" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.5px' }}>Nebula-Q</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', backgroundColor: '#1e293b', padding: '5px', borderRadius: '10px', border: '1px solid #334155' }}>
          {/* Added 'guide' to the navigation array */}
          {['home', 'guide', 'learn', 'library', 'ide'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                padding: '8px 20px', backgroundColor: activeTab === tab ? '#334155' : 'transparent', 
                color: activeTab === tab ? '#60a5fa' : '#94a3b8', border: 'none', borderRadius: '6px', 
                cursor: 'pointer', fontWeight: 'bold', textTransform: 'capitalize', display: 'flex', gap: '8px', alignItems: 'center',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'home' && <Home size={16}/>}
              {tab === 'guide' && <HelpCircle size={16}/>}
              {tab === 'learn' && <BookOpen size={16}/>}
              {tab === 'library' && <Library size={16}/>}
              {tab === 'ide' && <Code size={16}/>}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        
        {/* --- HOME VIEW --- */}
        <div style={{ display: activeTab === 'home' ? 'block' : 'none', padding: '80px 40px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '20px', borderRadius: '50%', backgroundColor: '#1e293b', marginBottom: '30px', border: '2px solid #3b82f6', boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)' }}>
            <Cpu size={80} color="#60a5fa" />
          </div>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '20px', lineHeight: '1.4', padding: '10px 0', background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Nebula-Q Compiler
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '50px', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto 50px auto' }}>
            A secure, cloud-native virtual environment for quantum circuit design. Design, compile, and mathematically visualize state vectors using IBM Qiskit directly in your browser.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button onClick={() => setActiveTab('guide')} style={{ padding: '15px 35px', fontSize: '1.1rem', backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HelpCircle size={20} /> How to Use
            </button>
            <button onClick={() => setActiveTab('library')} style={{ padding: '15px 35px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Library size={20} /> Open Library
            </button>
          </div>
        </div>

        {/* --- GUIDE VIEW --- */}
        <div style={{ display: activeTab === 'guide' ? 'block' : 'none', padding: '50px', maxWidth: '1000px', margin: '0 auto', lineHeight: '1.7' }}>
          <h1 style={{ fontSize: '2.5rem', borderBottom: '2px solid #334155', paddingBottom: '10px', marginBottom: '30px' }}>How to Use the Nebula-Q IDE</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
            {/* Step 1 */}
            <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '15px', borderLeft: '4px solid #3b82f6', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h2 style={{ color: '#60a5fa', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Code /> 1. Writing Your Code</h2>
              <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>
                The Nebula-Q sandbox eliminates the need for boilerplate code. You do <strong>not</strong> need to import libraries, declare qubits, or instantiate the circuit. 
                A global Qiskit <code>QuantumCircuit</code> object named <code>qc</code> is already pre-defined for you.
              </p>
              <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155', marginTop: '15px' }}>
                <p style={{ color: '#94a3b8', margin: '0 0 10px 0', fontSize: '0.9rem' }}>Example: Creating a Bell State</p>
                <code style={{ color: '#e2e8f0', display: 'block', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  print("Preparing Bell State...")<br/>
                  qc.h(0)     # Apply Hadamard gate to qubit 0<br/>
                  qc.cx(0, 1) # Apply CNOT gate (control: 0, target: 1)
                </code>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '15px', borderLeft: '4px solid #10b981', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h2 style={{ color: '#10b981', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Settings /> 2. Configuring the Simulation</h2>
              <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>
                Before compiling, you can adjust the physical parameters of the simulation using the IDE controls:
              </p>
              <ul style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>
                <li><strong>Decoherence Noise Slider:</strong> While Nebula-Q runs ideal statevector simulations by default, you can introduce artificial depolarizing noise to observe how fragile quantum states degrade in real-world Noisy Intermediate-Scale Quantum (NISQ) hardware.</li>
                <li><strong>Qubit Limit:</strong> The compiler automatically counts the qubits you use. A maximum of 10 qubits is enforced to prevent server-side memory exhaustion.</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '15px', borderLeft: '4px solid #8b5cf6', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h2 style={{ color: '#8b5cf6', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Activity /> 3. Reading the Output Artifacts</h2>
              <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>
                Clicking <strong>Compile & Run</strong> triggers the execution sandbox. The right-side panel will dynamically render four distinct artifacts:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                  <h4 style={{ color: '#e2e8f0', margin: '0 0 5px 0' }}>Terminal Console</h4>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Displays your `print()` statements and pinpointed syntax/security error tracebacks.</p>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                  <h4 style={{ color: '#e2e8f0', margin: '0 0 5px 0' }}>Mathematical Visualizer</h4>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Renders a 3D Bloch Sphere for single-qubit circuits, or a Probability Histogram for multi-qubit circuits.</p>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                  <h4 style={{ color: '#e2e8f0', margin: '0 0 5px 0' }}>ASCII Diagram</h4>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>A text-based topology map of your circuit's gate sequence.</p>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                  <h4 style={{ color: '#e2e8f0', margin: '0 0 5px 0' }}>OpenQASM Export</h4>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>The raw Quantum Assembly Language output used by physical quantum processors.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- LEARN VIEW --- */}
        <div style={{ display: activeTab === 'learn' ? 'block' : 'none', padding: '50px', maxWidth: '1000px', margin: '0 auto', lineHeight: '1.7' }}>
          
          <h1 style={{ fontSize: '2.5rem', borderBottom: '2px solid #334155', paddingBottom: '10px', marginBottom: '30px' }}>1. What is Quantum Computing?</h1>
          <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '15px', border: '1px solid #334155', marginBottom: '50px' }}>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>
              The theoretical framework of computation has historically been inextricably bound to classical mechanics. However, as physicist Richard Feynman posited in 1982, to efficiently simulate nature—which is inherently quantum mechanical—the computational architecture itself must be built upon quantum mechanical principles. 
            </p>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>
              Unlike classical computation, which relies on deterministic binary states (bits), quantum computation operates on <strong>qubits</strong>. A qubit can exist in a linear combination of its basis states simultaneously—a phenomenon known as <strong>superposition</strong>. Furthermore, quantum systems grow exponentially; an n-qubit system requires a tensor product space characterized by 2ⁿ complex coefficients, allowing quantum algorithms to solve specific classes of classically intractable problems.
            </p>
          </div>

          <h1 style={{ fontSize: '2.5rem', borderBottom: '2px solid #334155', paddingBottom: '10px', marginBottom: '30px' }}>2. The Educational Gap</h1>
          <div style={{ backgroundColor: '#0f172a', padding: '30px', borderRadius: '15px', borderLeft: '4px solid #ef4444', marginBottom: '50px' }}>
            <h3 style={{ color: '#ef4444', marginTop: 0 }}>The "Black Box" Phenomenon</h3>
            <p style={{ color: '#94a3b8' }}>
              Despite the availability of open-source SDKs, the developmental landscape of quantum computing presents severe deficiencies:
            </p>
            <ul style={{ color: '#94a3b8' }}>
              <li><strong>High Configuration Overhead:</strong> Traditional environments require managing Python versions, Jupyter kernels, and C++ dependencies, deterring users from experimenting.</li>
              <li><strong>Execution Opacity:</strong> The parsing and transpilation pipelines are hidden behind opaque function calls.</li>
              <li><strong>Lack of Visual Feedback:</strong> Measuring a quantum state collapses the superposition. In classical simulators, developers urgently need to visualize the complex state vector *before* simulated measurement, which traditional localized tools fail to provide graphically.</li>
            </ul>
          </div>

          <h1 style={{ fontSize: '2.5rem', borderBottom: '2px solid #334155', paddingBottom: '10px', marginBottom: '30px' }}>3. Our Solution: Nebula-Q</h1>
          <div style={{ backgroundColor: '#1e293b', padding: '35px', borderRadius: '15px', border: '1px solid #3b82f6', marginBottom: '50px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.1)' }}>
            <h2 style={{ color: '#60a5fa', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Shield /> AST-Secured Cloud Architecture</h2>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>
              Nebula-Q operationalizes quantum programming by abstracting the infrastructural friction. By centralizing the execution engine on a secure server and delegating the visualization to a responsive React frontend, we transform abstract mathematical complexity into an accessible engineering tool.
            </p>
            <ul style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>
              <li><strong>Zero-Setup IDE:</strong> Powered by Monaco Editor, users can write Qiskit code directly in the browser.</li>
              <li><strong>AST Code Validation:</strong> A defense-in-depth security architecture securely sandboxes user scripts through rigorous Abstract Syntax Tree validation, blocking malicious executions.</li>
              <li><strong>Exact Statevector Extraction:</strong> Utilizing IBM Qiskit, Nebula-Q extracts mathematically precise complex probability amplitudes without introducing stochastic sampling noise.</li>
            </ul>
          </div>

        </div>

        {/* --- LIBRARY VIEW --- */}
        <div style={{ display: activeTab === 'library' ? 'block' : 'none', padding: '50px', maxWidth: '1000px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Algorithm Library</h1>
          <p style={{ color: '#94a3b8', marginBottom: '40px', fontSize: '1.1rem' }}>Select an algorithm to load its Qiskit template into the compiler.</p>
          <div style={{ display: 'grid', gap: '25px' }}>
            {algorithms.length === 0 ? <p style={{ color: '#60a5fa' }}>Loading templates from backend...</p> : algorithms.map((algo) => (
              <div key={algo.id} style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '15px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: '75%' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: 'white', fontSize: '1.5rem' }}>{algo.title}</h2>
                  <p style={{ color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>{algo.description}</p>
                </div>
                <button onClick={() => loadAlgorithmToIDE(algo.code)} style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  Open Editor <ArrowRight size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* --- IDE VIEW --- */}
        <div style={{ display: activeTab === 'ide' ? 'flex' : 'none', height: 'calc(100vh - 70px)' }}>
          {/* Left: Editor */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155', backgroundColor: '#0f172a' }}>
            <div style={{ padding: '15px 25px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <FileTerminal size={20} color="#60a5fa" />
                <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>Qiskit Sandbox</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px' }}>Decoherence Noise: {noiseLevel}</label>
                  <input type="range" min="0" max="0.5" step="0.05" value={noiseLevel} onChange={(e) => setNoiseLevel(e.target.value)} style={{ width: '120px' }} />
                </div>
                <button onClick={runSimulation} disabled={isRunning} style={{ background: isRunning ? '#475569' : 'linear-gradient(to right, #10b981, #059669)', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '8px', cursor: isRunning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', boxShadow: isRunning ? 'none' : '0 4px 10px rgba(16, 185, 129, 0.3)' }}>
                  <Play size={18} /> {isRunning ? 'Compiling...' : 'Compile & Run'}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, paddingTop: '10px' }}>
              <Editor height="100%" defaultLanguage="python" theme="vs-dark" value={code} onChange={(value) => setCode(value)} options={{ minimap: { enabled: false }, fontSize: 16, padding: { top: 15 }, scrollBeyondLastLine: false }} />
            </div>
          </div>

          {/* Right: Visualization Engine & Terminal */}
          <div style={{ flex: '1.2', padding: '25px', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 25px 0', fontSize: '1.4rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server color="#8b5cf6" /> Execution Artifacts
            </h2>
            
            {/* TERMINAL OUTPUT PANEL */}
            <div style={{ backgroundColor: '#000000', padding: '15px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '25px', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '5px' }}>
                <Terminal size={14} /> <span>Compiler Output Console</span>
              </div>
              <pre style={{ margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.9rem', minHeight: '40px' }}>
                {terminalOutput || <span style={{ color: '#475569' }}>&gt; Ready for execution...</span>}
              </pre>
              {errorMessage && (
                <pre style={{ margin: '10px 0 0 0', color: '#ef4444', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {errorMessage}
                </pre>
              )}
            </div>

            {!errorMessage && !chartData && !isRunning && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', border: '2px dashed #334155', borderRadius: '15px', padding: '40px' }}>
                <Cpu size={60} style={{ marginBottom: '20px', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 10px 0', color: '#64748b' }}>Awaiting Circuit Submission</h3>
                <p style={{ margin: 0, textAlign: 'center', maxWidth: '300px' }}>Write your Qiskit gates on the left and click Compile to view exact Statevector probabilities, QASM, and ASCII diagrams.</p>
              </div>
            )}

            {/* Dynamic Rendering */}
            {chartData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                {/* Visualizer Card */}
                <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '15px', border: '1px solid #334155', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: '#60a5fa', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                    {resultType === 'histogram' ? 'Statevector Probabilities' : 'Bloch Sphere Projection'}
                    <span style={{ float: 'right', fontSize: '0.9rem', color: '#94a3b8', backgroundColor: '#0f172a', padding: '3px 10px', borderRadius: '10px' }}>Qubits: {numQubits}</span>
                  </h3>
                  
                  {resultType === 'histogram' && (
                    <div style={{ height: '300px', width: '100%' }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="state" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 14 }} />
                          <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val}%`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="prob" fill="url(#colorProb)" radius={[6, 6, 0, 0]} animationDuration={1200} />
                          <defs>
                            <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={1}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {resultType === 'bloch' && (
                    <BlochSphere x={chartData.x} y={chartData.y} z={chartData.z} />
                  )}
                </div>

                {/* ASCII Circuit Diagram Card */}
                {circuitDiagram && (
                  <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '15px', border: '1px solid #334155' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#10b981' }}>ASCII Circuit Topology</h3>
                    <pre style={{ margin: 0, backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', color: '#e2e8f0', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                      {circuitDiagram}
                    </pre>
                  </div>
                )}

                {/* QASM Export Card */}
                {qasm && (
                  <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '15px', border: '1px solid #334155' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#f59e0b' }}>OpenQASM 2.0 Export</h3>
                    <pre style={{ margin: 0, backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', color: '#cbd5e1', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {qasm}
                    </pre>
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}