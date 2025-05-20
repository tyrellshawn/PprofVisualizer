#!/bin/bash

# Script to generate different types of Go pprof profiles from example applications
# This will run the example applications and collect profiles to use in the pprof visualizer

# Create output directory
mkdir -p profiles

echo "Building Go example applications..."

# Build the web service
cd webservice
go build -o webservice
cd ..

# Build the memory app
cd memoryapp
go build -o memoryapp
cd ..

# Build the concurrency app
cd concurrency
go build -o concurrency
cd ..

# Function to run an app in the background and generate profiles
generate_profiles() {
    APP_NAME=$1
    APP_PATH="./$APP_NAME/$APP_NAME"
    PORT=$2
    PROFILE_TYPE=$3
    DURATION=$4
    
    echo "Starting $APP_NAME on port $PORT..."
    
    # Run the application in the background
    $APP_PATH -port=$PORT &
    APP_PID=$!
    
    # Wait for app to start
    sleep 2
    
    # Generate profile using pprof
    echo "Collecting $PROFILE_TYPE profile for $APP_NAME..."
    go tool pprof -$PROFILE_TYPE -seconds=$DURATION http://localhost:$PORT/debug/pprof/$PROFILE_TYPE > /dev/null
    
    # Save the profile
    cp /tmp/pprof/$PROFILE_TYPE.pprof ./profiles/${APP_NAME}_${PROFILE_TYPE}.pprof
    
    # Kill the application
    kill $APP_PID
    
    echo "$APP_NAME $PROFILE_TYPE profile saved to profiles/${APP_NAME}_${PROFILE_TYPE}.pprof"
    sleep 1
}

# Generate profiles for the web service
echo "Generating profiles for web service..."
generate_profiles "webservice" 8080 "cpu" 10
generate_profiles "webservice" 8080 "heap" 5
generate_profiles "webservice" 8080 "block" 5
generate_profiles "webservice" 8080 "mutex" 5

# Generate profiles for the memory app
echo "Generating profiles for memory app..."
generate_profiles "memoryapp" 8081 "cpu" 10
generate_profiles "memoryapp" 8081 "heap" 5
generate_profiles "memoryapp" 8081 "block" 5

# Generate profiles for the concurrency app
echo "Generating profiles for concurrency app..."
generate_profiles "concurrency" 8082 "cpu" 10
generate_profiles "concurrency" 8082 "mutex" 10
generate_profiles "concurrency" 8082 "block" 10

echo "Profile generation complete. Profiles saved to ./profiles/ directory."
echo "Use these profiles with the pprof visualizer application."

# List generated profiles
ls -lh ./profiles/