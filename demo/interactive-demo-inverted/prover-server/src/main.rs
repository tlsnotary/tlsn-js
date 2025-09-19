use interactive_networked_prover::run_server;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

const TRACING_FILTER: &str = "INFO";

const PROVER_HOST: &str = "0.0.0.0";
const PROVER_PORT: u16 = 9816;

/// Make sure the following domain is the same in SERVER_URL that will be proven
const SERVER_URL: &str = "https://raw.githubusercontent.com/tlsnotary/tlsn/refs/tags/v0.1.0-alpha.12/crates/server-fixture/server/src/data/1kb.json";

#[tokio::main]
async fn main() -> Result<(), eyre::ErrReport> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    run_server(PROVER_HOST, PROVER_PORT, SERVER_URL).await?;

    Ok(())
}
