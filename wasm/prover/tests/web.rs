//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use serde_json::Value;
use std::{collections::HashMap, str};
use wasm_bindgen_test::*;

extern crate tlsn_extension_rs;
use tlsn_extension_rs::*;

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
async fn verify() {
    let pem = str::from_utf8(include_bytes!("../../../test/assets/notary.pem")).unwrap();
    let proof = str::from_utf8(include_bytes!(
        "../../../test/assets/simple_proof_redacted.json"
    ))
    .unwrap();
    let m: HashMap<String, Value> = serde_json::from_str(
        &str::from_utf8(include_bytes!(
            "../../../test/assets/simple_proof_expected.json"
        ))
        .unwrap(),
    )
    .unwrap();

    let result = tlsn_extension_rs::verify(proof, pem).await.expect("result");

    log!("result: {}", &result);

    let r: VerifyResult = serde_json::from_str::<VerifyResult>(&result).unwrap();

    assert_eq!(r.server_name, m["serverName"]);
    assert!(r.recv.contains("<title>XXXXXXXXXXXXXX</title>"));
    assert_eq!(r.time, m["time"].as_u64().unwrap());
    assert_eq!(r.sent, m["sent"].as_str().unwrap());
    assert_eq!(r.recv, m["recv"].as_str().unwrap());
}
