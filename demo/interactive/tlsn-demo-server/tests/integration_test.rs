use std::time::Duration;
use tlsn_demo_server::{config::Config, prover::prover, run_server, verifier::verifier};
use tokio::time::timeout;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use async_tungstenite::{tokio::connect_async_with_config, tungstenite::protocol::WebSocketConfig};
use eyre::eyre;
use tlsn_demo_server::websocket_utils::create_websocket_request;
use tracing::info;
use ws_stream_tungstenite::WsStream;

const TRACING_FILTER: &str = "INFO";
const SERVER_START_DELAY: Duration = Duration::from_millis(500);
const TEST_TIMEOUT: Duration = Duration::from_secs(60);

fn init_tracing() {
    let _ = tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .try_init();
}

async fn start_test_server() -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let config = Config::default();
        run_server(&config)
            .await
            .expect("Server should start successfully")
    })
}

#[tokio::test]
async fn test_prover_verifier_integration() {
    init_tracing();

    let server_task = start_test_server().await;
    tokio::time::sleep(SERVER_START_DELAY).await;

    let config = Config::default();
    let result = timeout(TEST_TIMEOUT, async {
        info!("Connecting to server as verifier...");
        let request = create_websocket_request(&config.host, config.port, "/prove");
        let (ws_stream, _) = connect_async_with_config(request, Some(WebSocketConfig::default()))
            .await
            .map_err(|e| eyre!("Failed to connect to server: {}", e))?;
        let server_ws_socket = WsStream::new(ws_stream);
        info!("WebSocket connection established with server!");
        verifier(server_ws_socket, &config.server_domain()).await?;
        info!("Verification completed successfully!");
        Ok::<(), eyre::ErrReport>(())
    })
    .await;

    server_task.abort();

    match result {
        Ok(Ok(())) => {
            println!("✅ Integration test passed: Prover-Verifier communication successful")
        }
        Ok(Err(e)) => panic!("❌ Test failed: {}", e),
        Err(_) => panic!("❌ Test timed out after {:?}", TEST_TIMEOUT),
    }
}

#[tokio::test]
async fn test_verifier_prover_integration() {
    init_tracing();

    let server_task = start_test_server().await;
    tokio::time::sleep(SERVER_START_DELAY).await;

    let config = Config::default();
    let result = timeout(TEST_TIMEOUT, async {
        info!("Connecting to server as prover...");
        let request = create_websocket_request(&config.host, config.port, "/verify");
        let (ws_stream, _) = connect_async_with_config(request, Some(WebSocketConfig::default()))
            .await
            .map_err(|e| eyre!("Failed to connect to server: {}", e))?;
        let server_ws_socket = WsStream::new(ws_stream);
        info!("WebSocket connection established with server!");
        prover(server_ws_socket, &config.server_url).await?;
        info!("Proving completed successfully!");
        Ok::<(), eyre::ErrReport>(())
    })
    .await;

    server_task.abort();

    match result {
        Ok(Ok(())) => {
            println!("✅ Integration test passed: Verifier-Prover communication successful")
        }
        Ok(Err(e)) => panic!("❌ Test failed: {}", e),
        Err(_) => panic!("❌ Test timed out after {:?}", TEST_TIMEOUT),
    }
}

#[tokio::test]
async fn test_verifier_connection_failure() {
    init_tracing();

    let config = Config {
        port: 54321, // Non-existent port
        ..Config::default()
    };

    let result = timeout(Duration::from_secs(5), async {
        info!("Connecting to server as verifier...");
        let request = create_websocket_request(&config.host, config.port, "/prove");
        let (ws_stream, _) = connect_async_with_config(request, Some(WebSocketConfig::default()))
            .await
            .map_err(|e| eyre!("Failed to connect to server: {}", e))?;
        let server_ws_socket = WsStream::new(ws_stream);
        info!("WebSocket connection established with server!");
        verifier(server_ws_socket, &config.server_domain()).await?;
        info!("Verification completed successfully!");
        Ok::<(), eyre::ErrReport>(())
    })
    .await;

    match result {
        Ok(Ok(())) => panic!("Should not succeed when connecting to non-existent server"),
        Ok(Err(_)) => println!("✅ Correctly failed to connect to non-existent server"),
        Err(_) => println!("✅ Correctly timed out when connecting to non-existent server"),
    }
}
