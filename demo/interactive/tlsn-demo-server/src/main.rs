use tlsn_demo_server::{config::Config, run_ws_server};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

const TRACING_FILTER: &str = "INFO";

#[tokio::main]
async fn main() -> Result<(), eyre::ErrReport> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config: Config = Config::default();
    run_ws_server(&config).await?;

    Ok(())
}
