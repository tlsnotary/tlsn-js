pub(crate) mod hyper_io;
mod request_opt;
mod requests;

pub mod prover;
use futures::channel::oneshot;
use futures::Future;
pub use prover::prover;

pub mod verify;
use tracing::error;
pub use verify::verify;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;

pub use crate::request_opt::{RequestOptions, VerifyResult};

pub use wasm_bindgen_rayon::init_thread_pool;

use std::panic;
use tracing::debug;
use tracing_subscriber::fmt::format::Pretty;
use tracing_subscriber::fmt::time::UtcTime;
use tracing_subscriber::prelude::*;
use tracing_subscriber::EnvFilter;

use tracing_web::{performance_layer, MakeWebConsoleWriter};

extern crate console_error_panic_hook;

#[derive(Debug)]
pub struct Error(Box<dyn std::error::Error + Send + Sync + 'static>);

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}
impl std::error::Error for Error {}

impl Error {
    pub fn new<E: Into<Box<dyn std::error::Error + Send + Sync + 'static>>>(error: E) -> Self {
        Self(error.into())
    }
}

#[wasm_bindgen]
pub fn setup_tracing_web(logging_filter: &str) {
    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_ansi(false) // Only partially supported across browsers
        .with_timer(UtcTime::rfc_3339()) // std::time is not available in browsers
        // .with_thread_ids(true)
        // .with_thread_names(true)
        .with_writer(MakeWebConsoleWriter::new()); // write events to the console
    let perf_layer = performance_layer().with_details_from_fields(Pretty::default());

    let filter_layer = EnvFilter::builder()
        .parse(logging_filter)
        .unwrap_or_default();

    tracing_subscriber::registry()
        .with(filter_layer)
        .with(fmt_layer)
        .with(perf_layer)
        .init(); // Install these as subscribers to tracing events

    // https://github.com/rustwasm/console_error_panic_hook
    panic::set_hook(Box::new(|info| {
        error!("panic occurred: {:?}", info);
        console_error_panic_hook::hook(info);
    }));

    debug!("🪵 Logging set up 🪵")
}

fn spawn_with_handle<F: Future<Output = R> + Send + 'static, R: Send + 'static>(
    f: F,
) -> impl Future<Output = R> + Send + 'static {
    let (sender, receiver) = oneshot::channel();
    spawn_local(async move {
        _ = sender.send(f.await);
    });
    async move { receiver.await.unwrap() }
}

fn spawn_rayon_with_handle<
    F: FnOnce() -> Fut + Send + 'static,
    Fut: Future<Output = R> + 'static,
    R: Send + 'static,
>(
    f: F,
) -> impl Future<Output = R> + Send + 'static {
    let (sender, receiver) = oneshot::channel();
    rayon::spawn(move || {
        futures::executor::block_on(async move {
            _ = sender.send(f().await);
        })
    });
    async move { receiver.await.unwrap() }
}
