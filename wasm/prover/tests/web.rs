//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use gloo_utils::format::JsValueSerdeExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, str};
use wasm_bindgen::prelude::*;
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

// #[wasm_bindgen_test]
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

#[derive(Serialize, Deserialize, Debug)]
pub struct Options {
    pub method: String,
    pub headers: HashMap<String, String>,
    #[serde(rename = "maxTranscriptSize")]
    pub max_transcript_size: u64,
    #[serde(rename = "notaryUrl")]
    pub notary_url: String,
    pub body: String,
    #[serde(rename = "websocketProxyUrl")]
    pub websocket_proxy_url: String,
}

// #[wasm_bindgen_test]
async fn swapi_proof() {
    debug!("Test start");
    let target_url = "https://swapi.dev/api/people/1";
    let headers = HashMap::from([
        // ("secret".to_string(), "test_secret".to_string()),
        ("Host".to_string(), "swapi.dev".to_string()),
        ("Connection".to_string(), "close".to_string()),
    ]);
    let options = Options {
        method: "GET".to_string(),
        headers: headers,
        max_transcript_size: 16384,
        body: "".to_string(),
        notary_url: "https://notary.pse.dev".to_string(),
        websocket_proxy_url: "wss://notary.pse.dev/proxy?token=swapi.dev".to_string(),
    };
    log!("Options.headers: {:?}", &options.headers);
    log!("Options: {:?}", &options);
    // let val = serde_wasm_bindgen::to_value(&options).expect("Valid options");
    let val = JsValue::from_serde(&options).expect("Valid options");

    log!("Val to_value: {:?}", &val);

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

    let secret_headers = JsValue::NULL;
    let secret_body = JsValue::NULL;

    // let input = json!({
    //     "method": "GET",
    //     "headers": {
    //         "Host":  "swapi.dev",
    //         "Connection": "close",
    //     },
    //     "maxTranscriptSize": 16384,
    //     "body": "",
    //     "notaryUrl": "https://notary.pse.dev",
    //     "websocketProxyUrl": "wss://notary.pse.dev/proxy?token=swapi.dev",
    // });
    // let val = JsValue::from_serde(&input).expect("Valid options");
    // log!("Val from_serde: {:?}", &val);

    let proof = tlsn_extension_rs::prover(target_url, val, secret_headers, secret_body)
        .await
        .expect("result");
    debug!("Proof: {}", proof);
}
