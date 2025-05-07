# Stwo Wasm Demo

## Pre-requisites

- Rust: <https://www.rust-lang.org/tools/install>
- uv: <https://docs.astral.sh/uv/getting-started/installation/>

## Get started

- Then, run `cargo test --release` to check that the entire flow from running fibonacci, proving it and verifying it works.

## To compile Cairo programs

- install `uv`: <https://docs.astral.sh/uv/getting-started/installation/>
- To activate the Python dependencies, run: `uv sync --python /opt/homebrew/bin/python3.10`, you can run `export UV_PYTHON=/opt/homebrew/bin/python3.10`
- Then, compile fibonacci.cairo with `uv run compile cairo_programs/fibonacci.cairo --proof-mode`
