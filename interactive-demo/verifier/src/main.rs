use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use verifier::run_server;

const VERIFIER_HOST: &str = "0.0.0.0";
const VERIFIER_PORT: u16 = 9816;
const TRACING_FILTER: &str = "DEBUG";

/// Make sure these are the same on the prover side
const SERVER_DOMAIN: &str = "notary.pse.dev";
const VERIFICATION_SESSION_ID: &str = "interactive-verifier-demo";


#[tokio::main]
async fn main() -> Result<(), eyre::ErrReport> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    run_server(
        VERIFIER_HOST,
        VERIFIER_PORT,
        SERVER_DOMAIN,
        VERIFICATION_SESSION_ID,
    )
    .await?;

    Ok(())
}
