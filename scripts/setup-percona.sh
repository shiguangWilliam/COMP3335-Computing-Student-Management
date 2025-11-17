#!/usr/bin/env bash

set -euo pipefail

RESET_DATA=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -ResetData|--reset-data)
      RESET_DATA=true
      shift
      ;;
    *)
      echo "Unkonwn Param: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/docker"
DATA_DIR="${DOCKER_DIR}/data"
KEYRING_DIR="${DOCKER_DIR}/keyring"
CONFIG_PATH="${DOCKER_DIR}/my.cnf"
INIT_SQL="${PROJECT_ROOT}/init_database.sql"
CONTAINER_NAME="comp3335-db"

echo "==> Preparing directories..."
mkdir -p "${DOCKER_DIR}" "${DATA_DIR}" "${KEYRING_DIR}"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  cat > "${CONFIG_PATH}" <<'EOF'
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/keyring/keyring
EOF
  echo "    Created docker/my.cnf"
else
  echo "    docker/my.cnf already exists, skipping creation"
fi

if [[ "${RESET_DATA}" == "true" ]]; then
  echo "==> Clearing data/keyring directories (ResetData)..."
  rm -rf "${DATA_DIR}/"* "${KEYRING_DIR}/"*
fi

echo "==> Checking for old container..."
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
  echo "    Removing old container ${CONTAINER_NAME}"
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

if [[ ! -f "${INIT_SQL}" ]]; then
  echo "init_database.sql does not exist, cannot continue" >&2
  exit 1
fi

echo "==> Starting Percona container..."
docker run \
  --name "${CONTAINER_NAME}" \
  -p 3306:3306 \
  -p 33060:33060 \
  -e MYSQL_ROOT_PASSWORD='!testCOMP3335' \
  -e MYSQL_DATABASE=COMP3335 \
  -v "${PROJECT_ROOT}/docker/data:/var/lib/mysql" \
  -v "${PROJECT_ROOT}/docker/keyring:/keyring" \
  -v "${PROJECT_ROOT}/init_database.sql:/docker-entrypoint-initdb.d/init_database.sql" \
  percona/percona-server:latest \
  --early-plugin-load=keyring_file.so \
  --keyring_file_data=/keyring/keyring

echo
echo "Done. You can verify with the following command:"
echo "  docker exec ${CONTAINER_NAME} mysql -uroot -p'!testCOMP3335' -e \"SHOW DATABASES;\""