use std::net::{IpAddr, Ipv4Addr, SocketAddr, ToSocketAddrs};
use tlsn_demo_server::{config::Config, run_ws_server};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use wstcp::ProxyServer;

const TRACING_FILTER: &str = "INFO";

#[tokio::main]
async fn main() -> Result<(), eyre::ErrReport> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config: Config = Config::default();

    // Start wstcp proxy subprocess in background

    // Run both servers in parallel
    let (ws_result, proxy_result) =
        tokio::join!(run_ws_server(&config), run_wstcp_proxy_async(&config));

    // Handle results - if either fails, propagate the error
    ws_result?;
    proxy_result?;

    Ok(())
}

async fn run_wstcp_proxy_async(config: &Config) -> Result<(), eyre::ErrReport> {
    let bind_addr = SocketAddr::new(
        IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
        config.wstcp_proxy_port,
    );
    let tcp_server_addr = format!("{}:443", config.server_domain())
        .to_socket_addrs()?
        .next()
        .ok_or_else(|| eyre::eyre!("Failed to resolve hostname"))?;

    let listener = async_std::net::TcpListener::bind(bind_addr)
        .await
        .map_err(|e| eyre::eyre!("Failed to bind proxy listener: {}", e))?;

    let proxy = ProxyServer::new(listener.incoming(), tcp_server_addr)
        .await
        .map_err(|e| eyre::eyre!("Failed to create proxy server: {}", e))?;

    proxy
        .await
        .map_err(|e| eyre::eyre!("Proxy server error: {}", e))?;

    Ok(())
}
