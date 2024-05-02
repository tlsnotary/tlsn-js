pub(crate) mod hyper_io;
mod request_opt;
mod requests;

pub mod prover;
pub use prover::prover;

pub mod verify;
use tracing::error;
use tracing::level_filters::LevelFilter;
use tracing_subscriber::reload::Handle;
pub use verify::verify;

use wasm_bindgen::prelude::*;

pub use crate::request_opt::{RequestOptions, VerifyResult};

pub use wasm_bindgen_rayon::init_thread_pool;

use js_sys::JSON;

use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

use std::panic;
use std::sync::OnceLock;
use tracing_subscriber::fmt::format::Pretty;
use tracing_subscriber::fmt::time::UtcTime;
use tracing_subscriber::{filter, reload};
use tracing_subscriber::{prelude::*, Registry};
use tracing_web::{performance_layer, MakeWebConsoleWriter};

extern crate console_error_panic_hook;

struct LogReloadHandle {
    filter: LevelFilter,
    reload_handle: Handle<LevelFilter, Registry>,
}

fn reload_handle() -> &'static LogReloadHandle {
    static HANDLE: OnceLock<LogReloadHandle> = OnceLock::new();
    HANDLE.get_or_init(|| {
        //default level
        let filter = filter::LevelFilter::TRACE;
        let (_, reload_handle) = reload::Layer::new(filter);
        LogReloadHandle {
            filter,
            reload_handle,
        }
    })
}

#[wasm_bindgen(start)]
pub fn setup_tracing_web() {
    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_ansi(false) // Only partially supported across browsers
        .with_timer(UtcTime::rfc_3339()) // std::time is not available in browsers
        .with_writer(MakeWebConsoleWriter::new()); // write events to the console
    let perf_layer = performance_layer().with_details_from_fields(Pretty::default());

    let filter = reload_handle().filter;

    tracing_subscriber::registry()
        .with(filter)
        .with(fmt_layer)
        .with(perf_layer)
        .init(); // Install these as subscribers to tracing events

    // https://github.com/rustwasm/console_error_panic_hook
    panic::set_hook(Box::new(|info| {
        error!("panic occurred: {:?}", info);
        console_error_panic_hook::hook(info);
    }));
}

#[wasm_bindgen]
pub async fn set_log_level_filter(level: &str) -> Result<(), JsValue> {
    fn level_from_str(level: &str) -> Result<LevelFilter, JsValue> {
        match level.to_lowercase().as_str() {
            "trace" => Ok(LevelFilter::TRACE),
            "debug" => Ok(LevelFilter::DEBUG),
            "info" => Ok(LevelFilter::INFO),
            "warn" => Ok(LevelFilter::WARN),
            "error" => Ok(LevelFilter::ERROR),
            "off" => Ok(LevelFilter::OFF),
            _ => Err(JsValue::from_str(&format!(
                "Invalid log level: '{}'",
                level
            ))),
        }
    }

    let filter = level_from_str(level)?;
    println!("{:?}", filter);

    // Assume reload_handle() is a function or struct that provides access to modify the log level
    reload_handle()
        .reload_handle
        .modify(|f: &mut LevelFilter| *f = filter)
        .map_err(|e| JsValue::from_str(&format!("Failed to modify log level filter: {}", e)))?;

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
