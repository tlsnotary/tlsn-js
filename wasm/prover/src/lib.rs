pub(crate) mod hyper_io;
mod request_opt;
mod requests;

pub mod prover;
pub use prover::prover;

pub mod verify;
pub use verify::verify;

use wasm_bindgen::prelude::*;

pub use crate::request_opt::{RequestOptions, VerifyResult};

pub use wasm_bindgen_rayon::init_thread_pool;

use js_sys::JSON;

use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}
pub(crate) use log;

extern crate console_error_panic_hook;

pub async fn fetch_as_json_string(url: &str, opts: &RequestInit) -> Result<String, JsValue> {
    let request = Request::new_with_str_and_init(url, opts)?;
    let window = web_sys::window().expect("Window object");
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    assert!(resp_value.is_instance_of::<Response>());
    let resp: Response = resp_value.dyn_into()?;
    let json = JsFuture::from(resp.json()?).await?;
    let stringified = JSON::stringify(&json)?;
    stringified
        .as_string()
        .ok_or_else(|| JsValue::from_str("Could not stringify JSON"))
}
