use multiversx_sc_meta::*;
use minimal_contract::BettingContract;
use std::process::Command;
use std::fs;

fn main() {
    // Perform contract build using standard methods
    let contract_build_result = Command::new("cargo")
        .arg("build")
        .arg("--release")
        .current_dir("..")
        .status()
        .expect("Failed to build contract");

    if !contract_build_result.success() {
        eprintln!("Contract build failed");
        std::process::exit(1);
    }

    // Optional: Generate WASM output
    std::fs::create_dir_all("output").expect("Failed to create output directory");
}
