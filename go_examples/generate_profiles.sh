#!/bin/bash

# Script to generate various pprof profiles from example Go applications

# Set output directory
OUTPUT_DIR="./profiles"
mkdir -p $OUTPUT_DIR

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Go pprof Profile Generator ===${NC}"
echo "This script will generate various profiles from example Go applications."
echo "Profiles will be saved to: $OUTPUT_DIR"
echo ""

# Function to build Go applications
build_apps() {
  echo -e "${BLUE}Building example applications...${NC}"
  
  # Build the web service
  cd webservice
  go build -o main .
  cd ..
  
  # Build the memory app
  cd memoryapp 
  go build -o main .
  cd ..
  
  # Build the concurrency app
  cd concurrency
  go build -o main .
  cd ..
  
  echo -e "${GREEN}All applications built successfully.${NC}"
  echo ""
}

# Generate CPU profile from web service
generate_webservice_cpu() {
  echo -e "${BLUE}Generating CPU profile from web service...${NC}"
  echo "Starting web service on port 6060..."
  
  # Start the web service in the background
  cd webservice
  ./main &
  WEB_PID=$!
  
  # Allow service to start
  sleep 2
  
  echo "Making requests to generate CPU load..."
  # Generate load with multiple requests
  for i in {1..50}; do
    curl -s "http://localhost:6060/search?q=user" > /dev/null &
    curl -s "http://localhost:6060/compute" > /dev/null &
    if [ $((i % 10)) -eq 0 ]; then
      echo "Made $i requests..."
    fi
    sleep 0.1
  done
  
  # Capture the CPU profile
  echo "Capturing CPU profile..."
  curl -s "http://localhost:6060/debug/pprof/profile?seconds=5" > "$OUTPUT_DIR/webservice_cpu.pprof"
  
  # Kill the web service
  kill $WEB_PID
  cd ..
  
  echo -e "${GREEN}CPU profile saved to $OUTPUT_DIR/webservice_cpu.pprof${NC}"
  echo ""
}

# Generate Heap profile from memory app
generate_memory_heap() {
  echo -e "${BLUE}Generating Heap profile from memory app...${NC}"
  echo "Starting memory app on port 6061..."
  
  # Start the memory app in the background with leak simulation
  cd memoryapp
  ./main -http -leak &
  MEM_PID=$!
  
  # Allow the app to run and allocate memory
  echo "Letting memory app run for 10 seconds to allocate memory..."
  sleep 10
  
  # Capture the heap profile
  echo "Capturing Heap profile..."
  curl -s "http://localhost:6061/debug/pprof/heap" > "$OUTPUT_DIR/memory_heap.pprof"
  
  # Kill the memory app
  kill $MEM_PID
  cd ..
  
  echo -e "${GREEN}Heap profile saved to $OUTPUT_DIR/memory_heap.pprof${NC}"
  echo ""
}

# Generate Block and Mutex profiles from concurrency app
generate_concurrency_profiles() {
  echo -e "${BLUE}Generating Block and Mutex profiles from concurrency app...${NC}"
  echo "Starting concurrency app on port 6062 with high contention..."
  
  # Start the concurrency app in the background with high contention
  cd concurrency
  ./main -http -highcontention &
  CONC_PID=$!
  
  # Allow the app to run and generate contention
  echo "Letting concurrency app run for 10 seconds to generate contention..."
  sleep 10
  
  # Capture the block profile
  echo "Capturing Block profile..."
  curl -s "http://localhost:6062/debug/pprof/block" > "$OUTPUT_DIR/concurrency_block.pprof"
  
  # Capture the mutex profile
  echo "Capturing Mutex profile..."
  curl -s "http://localhost:6062/debug/pprof/mutex" > "$OUTPUT_DIR/concurrency_mutex.pprof"
  
  # Kill the concurrency app
  kill $CONC_PID
  cd ..
  
  echo -e "${GREEN}Block profile saved to $OUTPUT_DIR/concurrency_block.pprof${NC}"
  echo -e "${GREEN}Mutex profile saved to $OUTPUT_DIR/concurrency_mutex.pprof${NC}"
  echo ""
}

# Main execution

# Build the applications
build_apps

# Generate profiles
generate_webservice_cpu
generate_memory_heap
generate_concurrency_profiles

echo -e "${GREEN}All profiles generated successfully!${NC}"
echo "You can now upload these profiles to the visualization tool:"
echo "- $OUTPUT_DIR/webservice_cpu.pprof (CPU profile)"
echo "- $OUTPUT_DIR/memory_heap.pprof (Heap profile)"
echo "- $OUTPUT_DIR/concurrency_block.pprof (Block profile)"
echo "- $OUTPUT_DIR/concurrency_mutex.pprof (Mutex profile)"