#!/bin/sh
set -eu

# Combie installer — POSIX shell
# curl -fsSL https://combie.dev/install | sh

REPO="combie-dev/combie"
DEFAULT_VERSION="v0.1.0"
INSTALL_DIR="${HOME}/.local/bin"

# ----- helpers -----

RED=''
GREEN=''
NC=''
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  NC='\033[0m'
fi

die() {
  printf "%sError:%s %s\n" "${RED}" "${NC}" "$1" >&2
  exit 1
}

info() {
  printf "%s%s%s\n" "${GREEN}" "$1" "${NC}"
}

detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "${os}" in
    Darwin) os="darwin" ;;
    Linux)  os="linux" ;;
    *)      die "Unsupported OS: ${os}. Combie currently supports macOS and Linux." ;;
  esac

  case "${arch}" in
    x86_64|amd64)  arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) die "Unsupported architecture: ${arch}. Combie supports x86_64 and arm64." ;;
  esac

  # v0.1.0 release matrix: darwin-arm64, darwin-x64, linux-x64 only
  case "${os}-${arch}" in
    darwin-arm64|darwin-x64|linux-x64) ;;
    linux-arm64)
      die "Linux arm64 is not yet supported. Supported platforms: macOS Apple Silicon, macOS Intel, Linux x86_64."
      ;;
    *)
      die "Unsupported platform: ${os}-${arch}. Supported: macOS (arm64/x64), Linux x64."
      ;;
  esac

  echo "${os}-${arch}"
}

hash_file_sha256() {
  # Hash an explicit path (do not use `sha256sum -c`, which resolves names
  # relative to the caller's CWD and fails when the binary is in a temp dir).
  if command -v sha256sum > /dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
    return
  fi
  if command -v shasum > /dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
    return
  fi
  die "Neither sha256sum nor shasum found. Install one and retry."
}

verify_checksum() {
  local file expected_file expected actual
  file="$1"
  expected_file="$2"
  expected="$(awk '{print $1}' "${expected_file}")"
  actual="$(hash_file_sha256 "${file}")"
  if [ -z "${expected}" ] || [ -z "${actual}" ] || [ "${expected}" != "${actual}" ]; then
    die "Checksum verification FAILED.
Expected: ${expected}
Got: ${actual}"
  fi
}

# ----- resolve version -----

VERSION="${COMBIE_VERSION:-}"
if [ -z "${VERSION}" ]; then
  # Attempt to query the latest GitHub release
  if command -v curl > /dev/null 2>&1; then
    VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null \
      | grep '"tag_name":' \
      | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/' \
      || true)"
  fi
  if [ -z "${VERSION}" ]; then
    VERSION="${DEFAULT_VERSION}"
  fi
fi

# Strip leading 'v' for display if present
DISPLAY_VERSION="${VERSION}"
case "${DISPLAY_VERSION}" in v*) DISPLAY_VERSION="${DISPLAY_VERSION#v}" ;; esac

PLATFORM="$(detect_platform)"
ARTIFACT="combie-${PLATFORM}"
CHECKSUM_FILE="${ARTIFACT}.sha256"

BINARY_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARTIFACT}"
CHECKSUM_URL="https://github.com/${REPO}/releases/download/${VERSION}/${CHECKSUM_FILE}"

info "Installing Combie ${DISPLAY_VERSION}..."
printf "Detected %s.\n" "${PLATFORM}"

# ----- download -----

TMPDIR="${TMPDIR:-/tmp}"
TEMP_DIR="$(mktemp -d "${TMPDIR}/combie-install.XXXXXXXXXX")"
# shellcheck disable=SC2064
trap "rm -rf \"${TEMP_DIR}\"" EXIT

BINARY_PATH="${TEMP_DIR}/${ARTIFACT}"

printf "Downloading...\n"
if ! curl -fsSL -o "${BINARY_PATH}" "${BINARY_URL}"; then
  die "Download failed: ${BINARY_URL}"
fi

printf "Downloading checksums...\n"
if ! curl -fsSL -o "${TEMP_DIR}/${CHECKSUM_FILE}" "${CHECKSUM_URL}"; then
  die "Checksum download failed: ${CHECKSUM_URL}"
fi

# ----- verify -----

printf "Verifying checksum...\n"
verify_checksum "${BINARY_PATH}" "${TEMP_DIR}/${CHECKSUM_FILE}"

# ----- install -----

chmod +x "${BINARY_PATH}"

mkdir -p "${INSTALL_DIR}"

TARGET="${INSTALL_DIR}/combie"

if [ -f "${TARGET}" ]; then
  EXISTING_VERSION=""
  if "${TARGET}" --version > /dev/null 2>&1; then
    EXISTING_VERSION="$("${TARGET}" --version)"
  fi
  if [ -n "${EXISTING_VERSION}" ]; then
    printf "Replacing existing Combie (%s).\n" "${EXISTING_VERSION}"
  else
    printf "Replacing existing Combie binary.\n"
  fi
fi

mv "${BINARY_PATH}" "${TARGET}"

# ----- verify install -----

INSTALLED_VERSION="$("${TARGET}" --version)"
printf "\n%s\n\n" "${INSTALLED_VERSION}"
info "Installed Combie to ${TARGET}."

# ----- check PATH -----

case ":${PATH}:" in
  *:"${INSTALL_DIR}":*) ;;
  *)
    printf "Add %s to your PATH:\n" "${INSTALL_DIR}"
    printf '  export PATH="%s:$PATH"\n' "${INSTALL_DIR}"
    printf "To make this permanent, add that line to ~/.bashrc, ~/.zshrc, or ~/.profile.\n"
    ;;
esac

printf "\nNext:\n\n"
printf "  combie init\n"
printf "  combie connect github\n"
printf "  combie sync\n"
printf "  combie resources\n\n"
printf "Docs: https://github.com/combie-dev/combie\n"
