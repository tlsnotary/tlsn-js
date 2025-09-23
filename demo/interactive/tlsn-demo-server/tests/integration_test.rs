use std::time::Duration;
use tlsn_demo_server::{
    config::Config, prover::run_prover_test, run_server, verifier::run_verifier_test,
};
use tokio::time::timeout;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

const TRACING_FILTER: &str = "INFO";

#[tokio::test]
async fn test_prover_verifier_integration() {
    // Initialize tracing for test output
    let _ = tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .try_init();

    // Start prover server in background task
    let server_task = tokio::spawn(async move {
        let config: Config = Config::default();
        run_server(&config)
            .await
            .expect("Server should start successfully")
    });

    // Wait for server to start up
    tokio::time::sleep(Duration::from_millis(500)).await;

    // Run verifier test with timeout
    let config: Config = Config::default();
    let verification_result = timeout(
        Duration::from_secs(60), // Generous timeout for network operations
        run_verifier_test(&config),
    )
    .await;

    // Clean up server task
    server_task.abort();

    // Assert verification succeeded
    match verification_result {
        Ok(Ok(())) => {
            println!("✅ Integration test passed: Prover-Verifier communication successful");
        }
        Ok(Err(e)) => {
            panic!("❌ Verification failed: {}", e);
        }
        Err(_) => {
            panic!("❌ Verification timed out after 60 seconds");
        }
    }
}

#[tokio::test]
async fn test_verifier_prover_integration() {
    // Initialize tracing for test output
    let _ = tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .try_init();

    // Start prover server in background task
    let server_task = tokio::spawn(async move {
        let config: Config = Config::default();
        run_server(&config)
            .await
            .expect("Server should start successfully")
    });

    // Wait for server to start up
    tokio::time::sleep(Duration::from_millis(500)).await;

    // Run verifier test with timeout
    let config: Config = Config::default();
    let prover_result = timeout(
        Duration::from_secs(60), // Generous timeout for network operations
        run_prover_test(&config),
    )
    .await;

    // Clean up server task
    server_task.abort();

    // Assert verification succeeded
    match prover_result {
        Ok(Ok(())) => {
            println!("✅ Integration test passed: Prover-Verifier communication successful");
        }
        Ok(Err(e)) => {
            panic!("❌ Verification failed: {}", e);
        }
        Err(_) => {
            panic!("❌ Verification timed out after 60 seconds");
        }
    }
}

#[tokio::test]
async fn test_verifier_connection_failure() {
    // Test that verifier handles connection failure gracefully
    let config = Config {
        port: 54321, // wrong port
        ..Config::default()
    };

    let result = timeout(Duration::from_secs(5), run_verifier_test(&config)).await;

    // Should either timeout or return an error
    match result {
        Ok(Ok(())) => panic!("Should not succeed when connecting to non-existent server"),
        Ok(Err(_)) => println!("✅ Correctly failed to connect to non-existent server"),
        Err(_) => println!("✅ Correctly timed out when connecting to non-existent server"),
    }
}
