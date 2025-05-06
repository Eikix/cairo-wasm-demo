import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import init, { runProveAndVerify } from "./cairo_wasm_demo.js";

function App() {
  const [cairoOutput, setCairoOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWasmInitialized, setIsWasmInitialized] = useState(false);

  // Initialize WASM module when component mounts
  useEffect(() => {
    async function initializeWasm() {
      try {
        await init("/cairo_wasm_demo_bg.wasm");
        setIsWasmInitialized(true);
        console.log("WASM module initialized");
      } catch (err) {
        setError(`Failed to initialize WASM: ${err}`);
      }
    }
    initializeWasm();
  }, []);

  // Run the Cairo program
  const handleRunCairo = async () => {
    if (!isWasmInitialized) {
      setError("WASM module is not initialized yet");
      return;
    }
    try {
      runProveAndVerify();
      setCairoOutput("Proof verified");
      setError(null);
    } catch (err) {
      setError(`Cairo program error: ${err}`);
      setCairoOutput(null);
    }
  };

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + Cairo WASM</h1>
      <div className="card">
        <button onClick={handleRunCairo} disabled={!isWasmInitialized}>
          Run Cairo Program
        </button>
        {cairoOutput && (
          <p>
            <strong>Cairo Output:</strong> {cairoOutput}
          </p>
        )}
        {error && (
          <p style={{ color: "red" }}>
            <strong>Error:</strong> {error}
          </p>
        )}
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
