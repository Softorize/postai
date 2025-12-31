#!/bin/bash

# Build Python distribution for bundling with Electron
# This script creates a standalone Python environment with all dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PYTHON_DIST="$PROJECT_ROOT/python-dist"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "Building Python distribution for PostAI..."

# Clean existing distribution
rm -rf "$PYTHON_DIST"
mkdir -p "$PYTHON_DIST"

# Detect architecture
ARCH=$(uname -m)
echo "Building for architecture: $ARCH"

# Check for Python 3.11+
PYTHON_CMD=""
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3.12 &> /dev/null; then
    PYTHON_CMD="python3.12"
elif command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    if [[ "$PYTHON_VERSION" == "3.11" || "$PYTHON_VERSION" == "3.12" || "$PYTHON_VERSION" == "3.13" ]]; then
        PYTHON_CMD="python3"
    fi
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "Error: Python 3.11+ is required"
    exit 1
fi

echo "Using Python: $PYTHON_CMD ($($PYTHON_CMD --version))"

# Create virtual environment in python-dist
echo "Creating virtual environment..."
$PYTHON_CMD -m venv "$PYTHON_DIST/venv"

# Activate venv
source "$PYTHON_DIST/venv/bin/activate"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r "$BACKEND_DIR/requirements.txt"

# Create a startup script
echo "Creating startup script..."
cat > "$PYTHON_DIST/start-backend.sh" << 'EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Activate virtual environment
source "$SCRIPT_DIR/venv/bin/activate"

# Set environment variables
export DJANGO_SETTINGS_MODULE=postai.settings
export PYTHONPATH="$APP_ROOT/backend:$PYTHONPATH"

# Get port from argument or default
PORT=${1:-8765}

# Change to backend directory
cd "$APP_ROOT/backend"

# Run migrations if needed (first launch)
if [ ! -f "$APP_ROOT/data/db.sqlite3" ]; then
    mkdir -p "$APP_ROOT/data"
    python manage.py migrate --run-syncdb
fi

# Start server
exec python manage.py runserver 127.0.0.1:$PORT --noreload
EOF

chmod +x "$PYTHON_DIST/start-backend.sh"

# Create a version info file
echo "Creating version info..."
cat > "$PYTHON_DIST/version.json" << EOF
{
    "python": "$($PYTHON_CMD --version | cut -d' ' -f2)",
    "arch": "$ARCH",
    "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Deactivate venv
deactivate

# Calculate size
DIST_SIZE=$(du -sh "$PYTHON_DIST" | cut -f1)

echo ""
echo "Python distribution built successfully!"
echo "Location: $PYTHON_DIST"
echo "Size: $DIST_SIZE"
echo ""
echo "To test locally:"
echo "  cd $BACKEND_DIR"
echo "  source $PYTHON_DIST/venv/bin/activate"
echo "  python manage.py runserver"
