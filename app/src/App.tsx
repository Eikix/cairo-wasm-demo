import { useState, useEffect, useRef } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  const [cairoOutput, setCairoOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWasmInitialized, setIsWasmInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // To indicate processing

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize the worker
    // Note: Vite requires the `new URL(...)` syntax for worker imports.
    workerRef.current = new Worker(
      new URL("./cairo.worker.ts", import.meta.url),
      {
        type: "module", // Important for using ES modules in worker
      },
    );

    // Listen for messages from the worker
    workerRef.current.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case "WASM_INITIALIZED":
          setIsWasmInitialized(true);
          setError(null);
          console.log("WASM initialized message received from worker");
          break;
        case "CAIRO_RESULT":
          setCairoOutput(payload);
          setError(null);
          setIsLoading(false);
          break;
        case "ERROR":
        case "INIT_ERROR":
          setError(payload);
          setCairoOutput(null);
          setIsLoading(false);
          if (type === "INIT_ERROR") setIsWasmInitialized(false);
          break;
        default:
          console.warn("Unknown message type from worker:", type);
      }
    };

    // Send a message to the worker to initialize WASM
    workerRef.current.postMessage({ type: "INIT_WASM" });

    // Cleanup: terminate worker when component unmounts
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  const handleRunCairo = async () => {
    if (!isWasmInitialized) {
      setError(
        "WASM module is not initialized yet. Please wait or try refreshing.",
      );
      // Optionally, try to re-trigger initialization
      // workerRef.current?.postMessage({ type: "INIT_WASM" });
      return;
    }
    if (isLoading) return; // Prevent multiple clicks

    setIsLoading(true);
    setError(null);
    setCairoOutput(null);

    if (workerRef.current) {
      workerRef.current.postMessage({ type: "RUN_CAIRO" });
    } else {
      setError("Worker not available.");
      setIsLoading(false);
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
        <button
          onClick={handleRunCairo}
          disabled={!isWasmInitialized || isLoading}
        >
          {isLoading ? "Processing..." : "Run Cairo Program"}
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
        {!isWasmInitialized && !error && <p>Initializing WASM module...</p>}
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
