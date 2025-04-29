use interactive_networked_verifier::run_server;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

const TRACING_FILTER: &str = "INFO";

const VERIFIER_HOST: &str = "0.0.0.0";
const VERIFIER_PORT: u16 = 9816;

/// Make sure the following domain is the same in SERVER_URL on the prover side
const SERVER_DOMAIN: &str = "raw.githubusercontent.com";

#[tokio::main]
async fn main() -> Result<(), eyre::ErrReport> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    run_server(VERIFIER_HOST, VERIFIER_PORT, SERVER_DOMAIN).await?;

    Ok(())
}
