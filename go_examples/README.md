# Go pprof Example Applications

This directory contains Go applications designed to generate different types of profiles for visualization with our pprof visualization tool.

## Applications

1. **Web Service** (`/webservice`): A REST API that demonstrates CPU-intensive operations, memory allocations, and mutex contention.
   - Endpoints: 
     - `/users` - Get all users (memory intensive)
     - `/users/{id}` - Get a specific user (demonstrates caching)
     - `/search?q={query}` - Search users (CPU intensive)
     - `/compute` - Run an expensive computation (CPU intensive)
   - Built-in pprof endpoints on port 6060

2. **Memory App** (`/memoryapp`): An application specifically designed to demonstrate memory usage patterns and heap allocations.
   - Features:
     - Memory leak simulation mode
     - Temporary allocation mode
     - Real-time memory statistics
   - Built-in pprof endpoints on port 6061

3. **Concurrency App** (`/concurrency`): An application that demonstrates mutex contention and goroutine blocking.
   - Features:
     - High contention mode
     - Multiple readers and writers to shared resources
     - Block and mutex profiling
   - Built-in pprof endpoints on port 6062

## Running the Applications

### Web Service
```
cd webservice
go run main.go
```
Access the web service at http://localhost:6060

### Memory App
```
cd memoryapp
# Run in HTTP mode with memory leak simulation
go run main.go -http -leak
```
Access the memory app pprof endpoints at http://localhost:6061/debug/pprof/

### Concurrency App
```
cd concurrency
# Run in HTTP mode with high contention
go run main.go -http -highcontention
```
Access the concurrency app pprof endpoints at http://localhost:6062/debug/pprof/

## Generating Profiles

You can use the `generate_profiles.sh` script to automatically build the applications and generate profiles:

```
chmod +x generate_profiles.sh
./generate_profiles.sh
```

This will create the following profiles in the `/profiles` directory:
- `webservice_cpu.pprof` - CPU profile from the web service
- `memory_heap.pprof` - Heap profile from the memory app
- `concurrency_block.pprof` - Block profile from the concurrency app
- `concurrency_mutex.pprof` - Mutex profile from the concurrency app

## Capturing Profiles Manually

### CPU Profile
```
curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu_profile.pprof
```

### Heap Profile
```
curl http://localhost:6061/debug/pprof/heap > heap_profile.pprof
```

### Block Profile
```
curl http://localhost:6062/debug/pprof/block > block_profile.pprof
```

### Mutex Profile
```
curl http://localhost:6062/debug/pprof/mutex > mutex_profile.pprof
```

## Uploading to the Visualization Tool

After generating profiles, you can upload them to the visualization tool for analysis:

1. From the visualization tool interface, click "Upload Profile"
2. Select the profile file (e.g., `cpu_profile.pprof`)
3. Select the profile type (CPU, Heap, Block, or Mutex)
4. Add an optional description
5. Click "Upload" to visualize the profile