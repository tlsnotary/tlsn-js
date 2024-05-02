pub(crate) mod hyper_io;
mod request_opt;
mod requests;

pub mod prover;
pub use prover::prover;

pub mod verify;
use tracing::error;
use tracing::info;
use tracing::level_filters::LevelFilter;
use tracing_subscriber::reload::Handle;
pub use verify::verify;

use wasm_bindgen::prelude::*;

pub use crate::request_opt::{RequestOptions, VerifyResult};

pub use wasm_bindgen_rayon::init_thread_pool;

use js_sys::JSON;

use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

use once_cell::sync::OnceCell;
use std::panic;
use std::sync::Mutex;
use std::sync::OnceLock;
use tracing_subscriber::fmt::format::Pretty;
use tracing_subscriber::fmt::time::UtcTime;
use tracing_subscriber::prelude::*;
use tracing_subscriber::{filter, fmt, reload, Registry};
use tracing_web::{performance_layer, MakeWebConsoleWriter};
use wasm_bindgen::prelude::*;

extern crate console_error_panic_hook;

struct LogReloadHandle {
    filter: LevelFilter,
    reload_handle: Handle<LevelFilter, Registry>,
}

static SUBSCRIBER: OnceCell<Mutex<reload::Handle<filter::LevelFilter, Registry>>> = OnceCell::new();

#[wasm_bindgen(start)]
pub fn setup_tracing_web() {
    let fmt_layer = fmt::layer()
        .with_ansi(false)
        .with_timer(UtcTime::rfc_3339())
        .with_writer(MakeWebConsoleWriter::new());

    let (filter_layer, handle) = reload::Layer::new(filter::LevelFilter::TRACE);

    let _subscriber = tracing_subscriber::registry()
        .with(filter_layer)
        .with(fmt_layer)
        .with(performance_layer().with_details_from_fields(Pretty::default()))
        .init();

    SUBSCRIBER
        .set(Mutex::new(handle))
        .expect("Failed to set subscriber handle");
}

#[wasm_bindgen]
pub async fn set_log_level_filter(level: &str) -> Result<(), JsValue> {
    let level = match level.to_lowercase().as_str() {
        "trace" => filter::LevelFilter::TRACE,
        "debug" => filter::LevelFilter::DEBUG,
        "info" => filter::LevelFilter::INFO,
        "warn" => filter::LevelFilter::WARN,
        "error" => filter::LevelFilter::ERROR,
        "off" => filter::LevelFilter::OFF,
        _ => {
            return Err(JsValue::from_str(&format!(
                "Invalid log level: '{}'",
                level
            )))
        }
    };

    info!("Setting log level to {}", level);

    if let Some(handle) = SUBSCRIBER.get() {
        let handle = handle.lock().expect("Lock poisoned");
        handle
            .reload(level)
            .map_err(|e| JsValue::from_str(&format!("Failed to modify log level filter: {}", e)))?;
    } else {
        return Err(JsValue::from_str("Logging subsystem not initialized"));
    }

    Ok(())
}

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
