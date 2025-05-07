mod utils;

use cairo_vm::{
    cairo_run::{cairo_run, CairoRunConfig},
    hint_processor::builtin_hint_processor::builtin_hint_processor_definition::BuiltinHintProcessor,
    types::layout_name::LayoutName,
    vm::errors::cairo_run_errors::CairoRunError,
    vm::runners::cairo_runner::CairoRunner,
};
use wasm_bindgen::prelude::*;

use cairo_air::{verifier::verify_cairo, CairoProof, PreProcessedTraceVariant};
use stwo_cairo_adapter::{adapter::adapt_finished_runner, ProverInput};
use stwo_cairo_prover::{
    prover::prove_cairo,
    stwo_prover::core::vcs::blake2_merkle::{Blake2sMerkleChannel, Blake2sMerkleHasher},
};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(msg: &str);
}

#[wasm_bindgen(start)]
pub fn start() {
    crate::utils::set_panic_hook();
}

// TODO: check why this is needed. Seems wasm-bindgen expects us to use
// `std::error::Error` even if it's not yet in `core`
macro_rules! wrap_error {
    ($xp: expr) => {
        $xp.map_err(|e| JsError::new(e.to_string().as_str()))
    };
}

pub fn run_cairo_program() -> Result<CairoRunner, CairoRunError> {
    const PROGRAM_JSON: &[u8] = include_bytes!("../cairo_programs/fibonacci.json");

    let mut hint_executor = BuiltinHintProcessor::new_empty();

    let cairo_run_config = CairoRunConfig {
        entrypoint: "main",
        trace_enabled: true,
        relocate_mem: true,
        layout: LayoutName::all_cairo_stwo,
        proof_mode: true,
        secure_run: Some(true),
        disable_trace_padding: true,
        allow_missing_builtins: Default::default(),
        dynamic_layout_params: Default::default(),
    };

    let runner = cairo_run(PROGRAM_JSON, &cairo_run_config, &mut hint_executor)?;
    Ok(runner)
}

/// Proves a given prover input with STWO
///
/// Doesn't support proving pedersen hashes, because for performance purposes we prove with the
/// CanonicalWithoutPedersen variant preprocessed trace, which is faster to setup.
///
/// # Arguments
///
/// * `prover_input` - The prover input to prove
pub fn prove_with_stwo(
    prover_input: ProverInput,
) -> Result<CairoProof<Blake2sMerkleHasher>, Box<dyn std::error::Error>> {
    let pcs_config = Default::default();
    let preprocessed_trace = PreProcessedTraceVariant::CanonicalWithoutPedersen;
    let proof = prove_cairo::<Blake2sMerkleChannel>(prover_input, pcs_config, preprocessed_trace)?;
    Ok(proof)
}

/// Executes a Cairo program, generates a proof, and verifies the proof
/// All in one step, exposed to JavaScript
///
/// Returns:
///   - `Ok(())`: If the program ran successfully and was verified
///   - `Err(JsError)`: If any step in the process failed
#[wasm_bindgen(js_name = runProveAndVerify)]
pub fn run_prove_and_verify() -> Result<(), JsError> {
    let cairo_runner = wrap_error!(run_cairo_program())?;
    let prover_input = wrap_error!(adapt_finished_runner(cairo_runner))?;
    let proof: CairoProof<Blake2sMerkleHasher> = wrap_error!(prove_with_stwo(prover_input))?;
    let pcs_config = Default::default();
    let preprocessed_trace = PreProcessedTraceVariant::CanonicalWithoutPedersen;
    wrap_error!(verify_cairo::<Blake2sMerkleChannel>(
        proof,
        pcs_config,
        preprocessed_trace
    ))?;
    log("Proof generated");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::string::String;

    #[test]
    fn test_run_cairo_program() {
        let mut runner = run_cairo_program().unwrap();
        let mut output = String::new();
        runner.vm.write_output(&mut output).unwrap();
        assert_eq!(output, "144\n");
    }

    #[test]
    fn test_prove_verify() {
        let cairo_runner = run_cairo_program().unwrap();
        let prover_input = adapt_finished_runner(cairo_runner).unwrap();
        let proof = prove_with_stwo(prover_input).unwrap();
        let preprocessed_trace = PreProcessedTraceVariant::CanonicalWithoutPedersen;
        let pcs_config = Default::default();
        let _ =
            verify_cairo::<Blake2sMerkleChannel>(proof, pcs_config, preprocessed_trace).unwrap();
    }
}
