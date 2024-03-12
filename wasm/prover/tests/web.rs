//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use serde_json::Value;
use std::{collections::HashMap, str};
use wasm_bindgen_test::*;
use web_sys::RequestInit;

extern crate tlsn_extension_rs;
use js_sys::Array;
use tlsn_extension_rs::*;

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

macro_rules! debug {
    ( $( $t:tt )* ) => {
        web_sys::console::debug_1(&format!( $( $t )* ).into());
    }
}

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
async fn test_fetch() {
    let url = "https://swapi.info/api/";
    let mut opts = RequestInit::new();
    opts.method("GET");

    let rust_string: String = tlsn_extension_rs::fetch_as_json_string(&url, &opts)
        .await
        .unwrap();

    assert!(rust_string.contains("starships"));
}

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

    debug!("result: {}", &result);

    let r: VerifyResult = serde_json::from_str::<VerifyResult>(&result).unwrap();

    assert_eq!(r.server_name, m["serverName"]);
    assert!(r.recv.contains("<title>XXXXXXXXXXXXXX</title>"));
    assert_eq!(r.time, m["time"].as_u64().unwrap());
    assert_eq!(r.sent, m["sent"].as_str().unwrap());
    assert_eq!(r.recv, m["recv"].as_str().unwrap());
}

use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize)]
pub struct Options {
    pub method: String,
    pub headers: HashMap<String, String>,
    pub maxTranscriptSize: u64,
    pub notaryUrl: String,
    pub body: String,
    pub websocketProxyUrl: String,
}

#[wasm_bindgen_test]
async fn swapi_proof() {
    debug!("Test start");
    let target_url = "https://localhost:3000/formats/json?size=1";
    let options = Options {
        method: "GET".to_string(),
        headers: HashMap::from([("secret".to_string(), "test_secret".to_string())]),
        maxTranscriptSize: 20480,
        body: "".to_string(),
        notaryUrl: "http://localhost:7047".to_string(),
        websocketProxyUrl: "ws://localhost:55688".to_string(),
    };

    let secret_headers = JsValue::from(
        ["test_secret"]
            .iter()
            .map(|x| JsValue::from_str(x))
            .collect::<Array>(),
    );
    let secret_body = JsValue::from(
        ["John Doe", "Moby Dick"]
            .iter()
            .map(|x| JsValue::from_str(x))
            .collect::<Array>(),
    );
    let proof = tlsn_extension_rs::prover(
        target_url,
        serde_wasm_bindgen::to_value(&options).unwrap(),
        secret_headers,
        secret_body,
    )
    .await
    .expect("result");
    debug!("Proof: {}", proof);
}
