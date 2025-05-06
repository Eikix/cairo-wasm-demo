import init, { runProveAndVerify } from "./cairo_wasm_demo.js";

let wasmInitialized = false;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

async function initializeWasmInWorker() {
  if (wasmInitialized) {
    self.postMessage({ type: "WASM_INITIALIZED" });
    return Promise.resolve();
  }

  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  isInitializing = true;
  initializationPromise = (async () => {
    try {
      console.log("Worker: Attempting to initialize WASM module...");
      await init("/cairo_wasm_demo_bg.wasm");
      wasmInitialized = true;
      isInitializing = false;
      console.log("Worker: WASM module initialized successfully.");
      self.postMessage({ type: "WASM_INITIALIZED" });
    } catch (err) {
      isInitializing = false;
      wasmInitialized = false;
      console.error("Worker: Failed to initialize WASM:", err);
      self.postMessage({ type: "INIT_ERROR", payload: `Failed to initialize WASM in worker: ${err}` });
      throw err;
    }
  })();
  return initializationPromise;
}

self.onmessage = async (event: MessageEvent) => {
  const { type } = event.data;
  console.log("Worker: Received message:", type, event.data);

  if (type === "INIT_WASM") {
    try {
      await initializeWasmInWorker();
    } catch (err) {
      console.error("Worker: INIT_WASM call failed to complete initialization.");
    }
  } else if (type === "RUN_CAIRO") {
    if (!wasmInitialized) {
      console.warn("Worker: RUN_CAIRO called before WASM was initialized. Ensuring initialization...");
      try {
        await initializeWasmInWorker();
      } catch (err) {
        self.postMessage({ type: "ERROR", payload: "WASM module failed to initialize before run." });
        return;
      }
      if (!wasmInitialized) {
        self.postMessage({ type: "ERROR", payload: "WASM module is not initialized yet in worker." });
        return;
      }
    }

    console.log("Worker: WASM initialized, proceeding to run Cairo program.");
    try {
      runProveAndVerify();
      self.postMessage({ type: "CAIRO_RESULT", payload: "Proof verified" });
    } catch (err) {
      console.error("Worker: Cairo program error:", err);
      let errorMessage = `Cairo program error in worker: ${err}`;
      if (err instanceof Error) {
        errorMessage = `Cairo program error in worker: ${err.name} - ${err.message}\nStack: ${err.stack}`;
      }
      self.postMessage({ type: "ERROR", payload: errorMessage });
    }
  }
};
