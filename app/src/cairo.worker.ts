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

      // Allocate 8GB of memory (128,000 pages * 64KB)
      const memory = new WebAssembly.Memory({
        initial: 65536, // 8GB
        maximum: 65536, // Optional: cap at 8GB
      });

      // Import object for WASM module
      const importObject = {
        env: {
          memory,
          // Custom log function to handle string pointers (if needed by wasm-bindgen)
          log: (msgPtr: number, len: number) => {
            const memoryBuffer = new Uint8Array(memory.buffer);
            const msg = new TextDecoder().decode(memoryBuffer.subarray(msgPtr, msgPtr + len));
            console.log("WASM Log:", msg);
          },
        },
      };

      // Initialize WASM module with custom memory
      await init("/cairo_wasm_demo_bg.wasm", { importObject });

      // Log allocated memory size
      console.log("Worker: Allocated memory size:", memory.buffer.byteLength, "bytes");

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
      await runProveAndVerify();
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
