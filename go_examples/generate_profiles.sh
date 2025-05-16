#!/bin/bash

# Script to generate various Go pprof profiles from example applications
# Creates CPU, memory, block, and mutex profiles for visualization

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/profiles"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Build all example applications
echo "Building example applications..."
cd "$SCRIPT_DIR/webservice" && go build -o webservice main.go
cd "$SCRIPT_DIR/memoryapp" && go build -o memoryapp main.go
cd "$SCRIPT_DIR/concurrency" && go build -o concurrency main.go

# Function to capture profile from a running server
capture_server_profile() {
    local app_name=$1
    local port=$2
    local profile_type=$3
    local duration=$4
    local output_file="$OUTPUT_DIR/${app_name}_${profile_type}.pprof"
    
    echo "Capturing $profile_type profile from $app_name on port $port..."
    go tool pprof -$profile_type -seconds $duration -output "$output_file" http://localhost:$port/debug/pprof/$profile_type
    
    echo "  Profile saved to: $output_file"
}

# Function to generate load on a server
generate_load() {
    local app_name=$1
    local port=$2
    local endpoint=$3
    local requests=$4
    local concurrency=${5:-5}
    
    echo "Generating load on $app_name ($endpoint)..."
    
    for ((i = 1; i <= $requests; i++)); do
        curl -s "http://localhost:$port/$endpoint" > /dev/null &
        
        # Limit concurrency
        if (( i % $concurrency == 0 )); then
            wait
        fi
    done
    
    # Wait for any remaining requests to complete
    wait
}

# Start and profile webservice application
echo "======================"
echo "Profiling webservice"
echo "======================"

cd "$SCRIPT_DIR/webservice"
./webservice &
WEB_SERVICE_PID=$!

# Give the server time to start up
sleep 2

# Generate load
generate_load "webservice" "8080" "api/products" 20
generate_load "webservice" "8080" "api/search?q=product" 10
generate_load "webservice" "8080" "api/loadtest" 5 1

# Capture profiles
capture_server_profile "webservice" "8080" "profile" 5   # CPU profile
capture_server_profile "webservice" "8080" "heap" 1      # Memory profile
capture_server_profile "webservice" "8080" "allocs" 1    # Memory allocations profile

# Clean up
kill $WEB_SERVICE_PID
wait $WEB_SERVICE_PID 2>/dev/null || true

# Start and profile memory application
echo "======================"
echo "Profiling memoryapp"
echo "======================"

cd "$SCRIPT_DIR/memoryapp"
./memoryapp &
MEMORY_APP_PID=$!

# Give the server time to start up
sleep 2

# Generate load
generate_load "memoryapp" "8081" "allocate?size=5000000" 10
generate_load "memoryapp" "8081" "pool" 30
generate_load "memoryapp" "8081" "start-leak" 1
sleep 5  # Let the memory leak occur for a bit

# Capture profiles
capture_server_profile "memoryapp" "8081" "profile" 5    # CPU profile
capture_server_profile "memoryapp" "8081" "heap" 1       # Memory profile
capture_server_profile "memoryapp" "8081" "allocs" 1     # Memory allocations profile

# Clean up
kill $MEMORY_APP_PID
wait $MEMORY_APP_PID 2>/dev/null || true

# Start and profile concurrency application
echo "======================"
echo "Profiling concurrency"
echo "======================"

cd "$SCRIPT_DIR/concurrency"
./concurrency &
CONCURRENCY_PID=$!

# Give the server time to start up
sleep 2

# Generate load
generate_load "concurrency" "8082" "mutex-demo" 1
sleep 2
generate_load "concurrency" "8082" "rwmutex-demo" 1
sleep 2
generate_load "concurrency" "8082" "channel-demo" 1
sleep 5  # Let the concurrency demos run

# Capture profiles
capture_server_profile "concurrency" "8082" "profile" 5  # CPU profile
capture_server_profile "concurrency" "8082" "block" 1    # Block profile
capture_server_profile "concurrency" "8082" "mutex" 1    # Mutex profile

# Clean up
kill $CONCURRENCY_PID
wait $CONCURRENCY_PID 2>/dev/null || true

echo "======================"
echo "All profiles generated"
echo "======================"
echo "Profiles are available in: $OUTPUT_DIR"
ls -l "$OUTPUT_DIR"