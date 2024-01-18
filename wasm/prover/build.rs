use regex::Regex;
use std::{error::Error, process::Command};

fn main() {
    let raw_output = Command::new("clang")
        .arg("--version")
        .output()
        .expect("Could not verify clang version. Is clang installed?") //TODO add url here
        .stdout;
    let clang_version_str = std::str::from_utf8(&raw_output)
        .expect("Could not verify clang version. Is clang installed?");
    let clang_version = get_major_version(clang_version_str)
        .expect(format!("Could not verify clang version. {:?}?", &clang_version_str).as_str());

    if clang_version < 16 {
        panic!("Please install clang version 16.0 or newer.");
    }
}

fn get_major_version(clang_raw_version_output: &str) -> Result<u32, Box<dyn Error>> {
    let version_pattern = r#"version (\d+(\.\d+)+)"#;
    let re = Regex::new(version_pattern).unwrap();

    if let Some(captures) = re.captures(clang_raw_version_output) {
        let version = captures.get(1).map_or("", |m| m.as_str());
        if let Some(major_vesrion) = version.split('.').next() {
            return Ok(major_vesrion.parse::<u32>().unwrap());
        }
    }

    return Err(format!(
        "Could not verify clang version. {:?}?",
        &clang_raw_version_output
    )
    .into());
}

#[cfg(test)]
mod tests {
    use super::*;
    use rstest::rstest;

    #[rstest]
    #[case("Apple clang version 15.0.0 (clang-1500.0.40.1)
Target: arm64-apple-darwin23.1.0
Thread model: posix
InstalledDir: /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin", "15.0.0")]
    #[case(
        "Homebrew clang version 17.0.5
Target: arm64-apple-darwin23.1.0
Thread model: posix
InstalledDir: /opt/homebrew/Cellar/llvm/17.0.5/bin",
        "17.0.5"
    )]
    fn test_get_version(#[case] clang_output: &str, #[case] expected: &str) {
        assert_eq!(get_major_version(clang_output), Some(expected));
    }
}
