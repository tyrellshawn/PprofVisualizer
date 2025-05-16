package main

import (
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	_ "net/http/pprof" // Import pprof for HTTP profiling
	"os"
	"runtime"
	"runtime/pprof"
	"sync"
	"time"
)

// Shared resources with mutex protection
var (
	sharedData    = make(map[string][]byte)
	sharedDataMu  = &sync.RWMutex{}
	sharedCounter = 0
	counterMu     = &sync.Mutex{}
	waitGroup     = sync.WaitGroup{}
)

func main() {
	// Command line flags for profiling
	cpuProfile := flag.String("cpuprofile", "", "write cpu profile to file")
	blockProfile := flag.String("blockprofile", "", "write block profile to file") 
	mutexProfile := flag.String("mutexprofile", "", "write mutex profile to file")
	httpMode := flag.Bool("http", false, "run in HTTP server mode with pprof endpoints")
	highContention := flag.Bool("highcontention", false, "simulate high mutex contention")
	duration := flag.Int("duration", 60, "duration to run in seconds")
	flag.Parse()

	// Enable block and mutex profiling
	runtime.SetBlockProfileRate(1)
	runtime.SetMutexProfileFraction(1)

	// Start CPU profiling if requested
	if *cpuProfile != "" {
		f, err := os.Create(*cpuProfile)
		if err != nil {
			log.Fatal("could not create CPU profile: ", err)
		}
		defer f.Close()
		if err := pprof.StartCPUProfile(f); err != nil {
			log.Fatal("could not start CPU profile: ", err)
		}
		defer pprof.StopCPUProfile()
	}

	// HTTP mode setup
	if *httpMode {
		fmt.Println("Starting HTTP server with pprof endpoints on :6062")
		fmt.Println("Visit http://localhost:6062/debug/pprof/ to view profiling data")
		fmt.Println("High contention mode:", *highContention)
		
		// Start the concurrency simulation in the background
		go runConcurrencySimulation(*highContention, 0) // Run indefinitely in HTTP mode
		
		// Listen on a different port
		log.Fatal(http.ListenAndServe(":6062", nil))
		return
	}
	
	// Run the simulation for specified duration
	fmt.Printf("Running concurrency simulation for %d seconds...\n", *duration)
	fmt.Println("High contention mode:", *highContention)
	
	runConcurrencySimulation(*highContention, *duration)
	
	// Write block profile if requested
	if *blockProfile != "" {
		f, err := os.Create(*blockProfile)
		if err != nil {
			log.Fatal("could not create block profile: ", err)
		}
		defer f.Close()
		if err := pprof.Lookup("block").WriteTo(f, 0); err != nil {
			log.Fatal("could not write block profile: ", err)
		}
		fmt.Println("Block profile written to", *blockProfile)
	}
	
	// Write mutex profile if requested
	if *mutexProfile != "" {
		f, err := os.Create(*mutexProfile)
		if err != nil {
			log.Fatal("could not create mutex profile: ", err)
		}
		defer f.Close()
		if err := pprof.Lookup("mutex").WriteTo(f, 0); err != nil {
			log.Fatal("could not write mutex profile: ", err)
		}
		fmt.Println("Mutex profile written to", *mutexProfile)
	}
}

// runConcurrencySimulation executes various goroutines that contend for shared resources
func runConcurrencySimulation(highContention bool, durationSeconds int) {
	done := make(chan bool)
	
	// Set up a timeout if durationSeconds > 0
	if durationSeconds > 0 {
		go func() {
			time.Sleep(time.Duration(durationSeconds) * time.Second)
			close(done)
		}()
	}
	
	// Determine number of goroutines based on contention level
	readers := 5
	writers := 3
	if highContention {
		readers = 20
		writers = 10
	}
	
	// Start stats reporting
	go reportStats(done)
	
	// Start reader goroutines
	for i := 0; i < readers; i++ {
		waitGroup.Add(1)
		go dataReader(i, done, highContention)
	}
	
	// Start writer goroutines
	for i := 0; i < writers; i++ {
		waitGroup.Add(1)
		go dataWriter(i, done, highContention)
	}
	
	// Start counter incrementers
	for i := 0; i < 3; i++ {
		waitGroup.Add(1)
		go counterIncrementer(i, done, highContention)
	}
	
	// In HTTP mode, we never complete
	if durationSeconds <= 0 {
		select {} // Block forever
	}
	
	// Wait for all goroutines to finish
	waitGroup.Wait()
	fmt.Println("Concurrency simulation complete")
}

// dataReader reads data with a shared lock, simulating read operations
func dataReader(id int, done <-chan bool, highContention bool) {
	defer waitGroup.Done()
	
	keyCount := 100
	readInterval := 10 * time.Millisecond
	if highContention {
		readInterval = 2 * time.Millisecond
	}
	
	ticker := time.NewTicker(readInterval)
	defer ticker.Stop()
	
	fmt.Printf("Reader %d started\n", id)
	
	for {
		select {
		case <-done:
			fmt.Printf("Reader %d stopping\n", id)
			return
		case <-ticker.C:
			// Pick a random key to read
			key := fmt.Sprintf("key-%d", rand.Intn(keyCount))
			
			// Use a read lock to access the data
			sharedDataMu.RLock()
			data, exists := sharedData[key]
			// Simulate some processing while holding the lock
			if exists && highContention {
				time.Sleep(time.Millisecond) // Hold lock longer in high contention mode
				_ = len(data) // Do something with the data
			}
			sharedDataMu.RUnlock()
			
			// Do some work outside the lock
			time.Sleep(time.Millisecond)
		}
	}
}

// dataWriter writes data with an exclusive lock, simulating write operations
func dataWriter(id int, done <-chan bool, highContention bool) {
	defer waitGroup.Done()
	
	keyCount := 100
	writeInterval := 50 * time.Millisecond
	if highContention {
		writeInterval = 10 * time.Millisecond
	}
	
	ticker := time.NewTicker(writeInterval)
	defer ticker.Stop()
	
	fmt.Printf("Writer %d started\n", id)
	
	for {
		select {
		case <-done:
			fmt.Printf("Writer %d stopping\n", id)
			return
		case <-ticker.C:
			// Pick a random key to write
			key := fmt.Sprintf("key-%d", rand.Intn(keyCount))
			
			// Create some random data
			size := 1024 + rand.Intn(9216) // 1KB to 10KB
			data := make([]byte, size)
			rand.Read(data)
			
			// Take a write lock to update the data
			sharedDataMu.Lock()
			sharedData[key] = data
			// Simulate processing while holding the lock
			if highContention {
				time.Sleep(2 * time.Millisecond) // Hold lock longer in high contention mode
			}
			sharedDataMu.Unlock()
			
			// Do some work outside the lock
			time.Sleep(5 * time.Millisecond)
		}
	}
}

// counterIncrementer increments a counter with mutex protection, showing lock contention
func counterIncrementer(id int, done <-chan bool, highContention bool) {
	defer waitGroup.Done()
	
	incrementInterval := 5 * time.Millisecond
	if highContention {
		incrementInterval = 1 * time.Millisecond
	}
	
	ticker := time.NewTicker(incrementInterval)
	defer ticker.Stop()
	
	fmt.Printf("Incrementer %d started\n", id)
	
	localCounter := 0
	
	for {
		select {
		case <-done:
			fmt.Printf("Incrementer %d stopping (local: %d)\n", id, localCounter)
			return
		case <-ticker.C:
			// Take mutex to increment counter
			counterMu.Lock()
			sharedCounter++
			localCounter++
			// Simulate some work while holding the lock
			if highContention {
				time.Sleep(time.Millisecond)
			}
			counterMu.Unlock()
			
			// Do some more work outside the lock
			fibonacci(10) // Compute something to use CPU
		}
	}
}

// reportStats periodically reports statistics about the simulation
func reportStats(done <-chan bool) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			// Report shared counter value (requires lock)
			counterMu.Lock()
			counterValue := sharedCounter
			counterMu.Unlock()
			
			// Report map size (requires lock)
			sharedDataMu.RLock()
			mapSize := len(sharedData)
			var totalBytes int
			for _, data := range sharedData {
				totalBytes += len(data)
			}
			sharedDataMu.RUnlock()
			
			fmt.Printf("Stats: Counter=%d, Map entries=%d, Total data=%.2f MB\n", 
				counterValue, mapSize, float64(totalBytes)/1024/1024)
			
			// Report goroutine count
			fmt.Printf("Goroutines: %d\n", runtime.NumGoroutine())
		}
	}
}

// fibonacci computes fibonacci numbers recursively (CPU intensive)
func fibonacci(n int) int {
	if n <= 1 {
		return n
	}
	return fibonacci(n-1) + fibonacci(n-2)
}