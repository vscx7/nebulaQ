import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, AlertCircle, Server, BookOpen, Code, Library, Home, ArrowRight, Lightbulb, Shield, Zap } from 'lucide-react';

// --- CUSTOM BLOCH SPHERE COMPONENT (SVG) ---
// Renders a 3D-looking sphere using 2D SVG math for performance
const BlochSphere = ({ x, y, z }) => {
  // Map 3D coordinates to a 2D projection
  const scale = 100;
  const cx = 150;
  const cy = 150;
  
  // Simple isometric projection
  const projX = cx + (y * scale) - (x * scale * 0.5);
  const projY = cy - (z * scale) + (x * scale * 0.3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="300" height="300" viewBox="0 0 300 300">
        {/* Sphere Background */}
        <circle cx={cx} cy={cy} r={scale} fill="#1e293b" stroke="#334155" strokeWidth="2" />
        
        {/* Equator (XY Plane) */}
        <ellipse cx={cx} cy={cy} rx={scale} ry={scale * 0.3} fill="none" stroke="#334155" strokeDasharray="5,5" />
        
        {/* Z Axis */}
        <line x1={cx} y1={cy - scale} x2={cx} y2={cy + scale} stroke="#475569" strokeDasharray="4,4" />
        <text x={cx - 15} y={cy - scale - 5} fill="#94a3b8" fontSize="14">|0⟩ (Z)</text>
        <text x={cx - 15} y={cy + scale + 15} fill="#94a3b8" fontSize="14">|1⟩</text>

        {/* X and Y Axes */}
        <line x1={cx - scale} y1={cy} x2={cx + scale} y2={cy} stroke="#475569" strokeDasharray="4,4" />
        <text x={cx + scale + 5} y={cy + 5} fill="#94a3b8" fontSize="14">Y</text>
        <line x1={cx - scale*0.7} y1={cy + scale*0.5} x2={cx + scale*0.7} y2={cy - scale*0.5} stroke="#475569" strokeDasharray="4,4" />
        <text x={cx - scale*0.7 - 15} y={cy + scale*0.5 + 10} fill="#94a3b8" fontSize="14">X</text>

        {/* State Vector Arrow */}
        <line x1={cx} y1={cy} x2={projX} y2={projY} stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowhead)" />
        <circle cx={projX} cy={projY} r="4" fill="#60a5fa" />
        
        {/* Arrowhead Definition */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>
      </svg>
      <div style={{ marginTop: '10px', color: '#cbd5e1', fontFamily: 'monospace', backgroundColor: '#0f172a', padding: '10px', borderRadius: '5px' }}>
        X: {x.toFixed(3)} | Y: {y.toFixed(3)} | Z: {z.toFixed(3)}
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [algorithms, setAlgorithms] = useState([]);
  
  // IDE States
  const [code, setCode] = useState("# Select an algorithm from the Library, or start typing your Cirq code here...\n\n");
  const [noiseLevel, setNoiseLevel] = useState(0.0);
  const [isRunning, setIsRunning] = useState(false);
  const [resultType, setResultType] = useState(null); // 'histogram' or 'bloch'
  const [chartData, setChartData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch algorithms on load
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
  };

  const runSimulation = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    setChartData(null);
    setResultType(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/submit-code/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, framework: 'cirq', noise_level: parseFloat(noiseLevel) }),
      });

      const data = await response.json();

      if (data.status === 'Completed' && data.output) {
        // We now expect the backend to send { "type": "...", "data": {...} }
        setResultType(data.output.type);
        
        if (data.output.type === 'histogram') {
          const formattedData = Object.entries(data.output.data).map(([state, count]) => ({
            state: `|${state}⟩`, count: count
          }));
          setChartData(formattedData);
        } else if (data.output.type === 'bloch') {
          setChartData(data.output.data); // {x, y, z}
        }
      } else {
        setErrorMessage(data.error || "Execution error. Did you print() the correct JSON format?");
      }
    } catch (err) {
      setErrorMessage("Failed to connect to backend. Is Uvicorn running?");
    } finally {
      setIsRunning(false);
    }
  };

  // --- PAGE COMPONENTS ---

  const HomeView = () => (
    <div style={{ padding: '60px 40px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
      <Server size={64} color="#3b82f6" style={{ marginBottom: '20px' }} />
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>QuantumCloud PaaS</h1>
      <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '40px', lineHeight: '1.6' }}>
        A next-generation platform for simulating quantum algorithms, visualizing quantum states, and understanding the future of computing. 
        Built for developers, researchers, and students.
      </p>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <button onClick={() => setActiveTab('learn')} style={{ padding: '15px 30px', fontSize: '1.1rem', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen /> Learn the Basics
        </button>
        <button onClick={() => setActiveTab('library')} style={{ padding: '15px 30px', fontSize: '1.1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Library /> Explore Algorithms
        </button>
      </div>
    </div>
  );

  const LearnView = () => (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', lineHeight: '1.6' }}>
      <h1 style={{ fontSize: '2.5rem', borderBottom: '2px solid #334155', paddingBottom: '10px' }}>Understanding Quantum Computing</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', margin: '30px 0' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '10px' }}>
          <h3 style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px' }}><Lightbulb /> Superposition</h3>
          <p style={{ color: '#cbd5e1' }}>While a classical bit is like a coin on a table (Heads OR Tails), a Qubit is like a spinning coin. It exists in a blur of both possibilities until you "measure" it (slap it onto the table).</p>
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '10px' }}>
          <h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}><Zap /> Entanglement</h3>
          <p style={{ color: '#cbd5e1' }}>Qubits can be mathematically linked. If you entangle two qubits, measuring one instantly determines the state of the other, even if they are lightyears apart.</p>
        </div>
      </div>

      <h2 style={{ marginTop: '40px' }}>Coding Guidelines for this Platform</h2>
      <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155', color: '#94a3b8' }}>
        <ul style={{ listStyleType: 'circle', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '10px' }}><strong>Language:</strong> Python 3 using Google's <code>cirq</code> framework.</li>
          <li style={{ marginBottom: '10px' }}><strong>Noise Variable:</strong> You can read the UI's noise slider by using the global variable <code>PLATFORM_NOISE_LEVEL</code> in your code.</li>
          <li style={{ marginBottom: '10px' }}><strong>Mandatory Output:</strong> To draw charts, your code <strong>MUST</strong> end with a <code>print()</code> statement outputting a JSON string.</li>
<li style={{ marginBottom: '10px' }}>For Histograms: <code>{'print(json.dumps({"type": "histogram", "data": {"00": 50, "11": 50}}))'}</code></li>
<li>For Bloch Sphere: <code>{'print(json.dumps({"type": "bloch", "data": {"x": 0, "y": 1, "z": 0}}))'}</code></li>
        </ul>
      </div>
    </div>
  );

  const LibraryView = () => (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Algorithm Library</h1>
      <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Select an algorithm to load its template into the compiler.</p>
      
      <div style={{ display: 'grid', gap: '20px' }}>
        {algorithms.length === 0 ? <p>Loading algorithms from backend...</p> : algorithms.map((algo) => (
          <div key={algo.id} style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ maxWidth: '70%' }}>
              <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>{algo.title}</h2>
              <p style={{ color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>{algo.description}</p>
              <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '0.8rem', padding: '3px 8px', backgroundColor: '#0f172a', borderRadius: '4px', color: '#3b82f6' }}>
                Output: {algo.expected_output_type.toUpperCase()}
              </span>
            </div>
            <button 
              onClick={() => loadAlgorithmToIDE(algo.code)}
              style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
            >
              Open in IDE <ArrowRight size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const IdeView = () => (
    <div style={{ display: 'flex', height: 'calc(100vh - 65px)' }}>
      {/* Left: Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155' }}>
        <div style={{ padding: '15px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>Hardware Decoherence Noise: {noiseLevel}</label>
            <input type="range" min="0" max="0.5" step="0.01" value={noiseLevel} onChange={(e) => setNoiseLevel(e.target.value)} style={{ width: '150px' }} />
          </div>
          <button onClick={runSimulation} disabled={isRunning} style={{ backgroundColor: isRunning ? '#475569' : '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: isRunning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <Play size={18} /> {isRunning ? 'Running...' : 'Execute Code'}
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <Editor height="100%" defaultLanguage="python" theme="vs-dark" value={code} onChange={(value) => setCode(value)} options={{ minimap: { enabled: false }, fontSize: 15, padding: { top: 20 } }} />
        </div>
      </div>

      {/* Right: Visualization */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#cbd5e1' }}>Visualization Engine</h2>
        
        {errorMessage && (
          <div style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '15px', borderRadius: '5px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle size={20} /> <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{errorMessage}</pre>
          </div>
        )}

        {!errorMessage && !chartData && !isRunning && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', border: '2px dashed #334155', borderRadius: '10px' }}>
            Run a simulation to generate visualizations.
          </div>
        )}

        {/* Dynamic Rendering based on Output Type */}
        {chartData && resultType === 'histogram' && (
          <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="state" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip cursor={{ fill: '#334155' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData && resultType === 'bloch' && (
          <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BlochSphere x={chartData.x} y={chartData.y} z={chartData.z} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* GLOBAL TOP NAVIGATION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 30px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
          <Server size={24} color="#3b82f6" />
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>QC Platform</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          {['home', 'learn', 'library', 'ide'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                padding: '8px 16px', backgroundColor: activeTab === tab ? '#334155' : 'transparent', 
                color: activeTab === tab ? 'white' : '#94a3b8', border: 'none', borderRadius: '5px', 
                cursor: 'pointer', fontWeight: 'bold', textTransform: 'capitalize', display: 'flex', gap: '8px', alignItems: 'center'
              }}
            >
              {tab === 'home' && <Home size={16}/>}
              {tab === 'learn' && <BookOpen size={16}/>}
              {tab === 'library' && <Library size={16}/>}
              {tab === 'ide' && <Code size={16}/>}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'learn' && <LearnView />}
        {activeTab === 'library' && <LibraryView />}
        {activeTab === 'ide' && <IdeView />}
      </div>
    </div>
  );
}