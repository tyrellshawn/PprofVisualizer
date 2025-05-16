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

// Global memory sinks to prevent GC from cleaning up
var (
	memSink     [][]byte
	memSinkLock sync.Mutex
)

func main() {
	// Command line flags for profiling
	cpuProfile := flag.String("cpuprofile", "", "write cpu profile to file")
	memProfile := flag.String("memprofile", "", "write memory profile to file")
	httpMode := flag.Bool("http", false, "run in HTTP server mode with pprof endpoints")
	leakMode := flag.Bool("leak", false, "simulate memory leaks")
	flag.Parse()

	// Setup CPU profiling if requested
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

	// Run in HTTP server mode if requested
	if *httpMode {
		fmt.Println("Starting HTTP server with pprof endpoints on :6061")
		fmt.Println("Visit http://localhost:6061/debug/pprof/ to view profiling data")
		fmt.Println("Memory leak simulation mode:", *leakMode)
		
		// Start the memory consumer in the background
		go runMemoryConsumer(*leakMode)
		
		// Listen on a different port from the web service example
		log.Fatal(http.ListenAndServe(":6061", nil))
		return
	}

	// Otherwise, run as a CLI app
	fmt.Println("Running memory usage simulation...")
	fmt.Println("Memory leak simulation mode:", *leakMode)
	
	// Run memory-intensive operations
	runMemoryConsumer(*leakMode)
	
	// Write memory profile if requested
	if *memProfile != "" {
		f, err := os.Create(*memProfile)
		if err != nil {
			log.Fatal("could not create memory profile: ", err)
		}
		defer f.Close()
		runtime.GC() // Get up-to-date statistics
		if err := pprof.WriteHeapProfile(f); err != nil {
			log.Fatal("could not write memory profile: ", err)
		}
	}
}

// runMemoryConsumer simulates memory-intensive operations
func runMemoryConsumer(leakMode bool) {
	// Create some initial allocations
	initialAllocations()
	
	// Setup timers for periodic operations
	allocTicker := time.NewTicker(500 * time.Millisecond)
	gcTicker := time.NewTicker(5 * time.Second)
	statsTicker := time.NewTicker(2 * time.Second)
	
	fmt.Println("Memory consumer started. Press Ctrl+C to stop.")
	
	// Main operation loop
	for {
		select {
		case <-allocTicker.C:
			if leakMode {
				// In leak mode, we store references to prevent garbage collection
				simulateMemoryLeak()
			} else {
				// In normal mode, we allow for garbage collection
				simulateTemporaryAllocation()
			}
		
		case <-gcTicker.C:
			// Force garbage collection
			if !leakMode {
				runtime.GC()
				fmt.Println("Garbage collection triggered")
			}
		
		case <-statsTicker.C:
			// Print memory stats
			printMemStats()
		}
	}
}

// initialAllocations creates a baseline of memory usage
func initialAllocations() {
	// Create some initial array allocations of different sizes
	memSinkLock.Lock()
	defer memSinkLock.Unlock()
	
	memSink = make([][]byte, 0, 100)
	
	// Allocate 50MB in various chunk sizes
	for i := 0; i < 50; i++ {
		// Allocate chunks from 100KB to 1MB
		size := 100*1024 + rand.Intn(900*1024)
		memSink = append(memSink, make([]byte, size))
	}
	
	fmt.Println("Initial allocations complete")
}

// simulateMemoryLeak adds memory that won't be garbage collected
func simulateMemoryLeak() {
	memSinkLock.Lock()
	defer memSinkLock.Unlock()
	
	// Allocate a new array of random data between 500KB and 2MB
	size := 500*1024 + rand.Intn(1500*1024)
	data := make([]byte, size)
	
	// Fill with random data
	rand.Read(data)
	
	// Store in our global slice to prevent garbage collection
	memSink = append(memSink, data)
	
	// Make the leak slower in high memory situations
	if len(memSink) > 200 {
		// Sleep to slow down the leak as it grows
		time.Sleep(100 * time.Millisecond)
	}
}

// simulateTemporaryAllocation creates short-lived objects
func simulateTemporaryAllocation() {
	// Create many objects that will be immediately garbage collected
	var wg sync.WaitGroup
	
	// Spawn goroutines that allocate memory
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			
			// Allocate a block of 1-5MB
			size := 1*1024*1024 + rand.Intn(4*1024*1024)
			data := make([]byte, size)
			
			// Do some work with the data to prevent optimization
			for j := 0; j < size; j += 1024 {
				data[j] = byte(j % 256)
			}
			
			// Simulate processing time
			time.Sleep(20 * time.Millisecond)
			
			// data will be garbage collected after this function ends
		}()
	}
	
	wg.Wait()
}

// printMemStats displays current memory usage
func printMemStats() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	
	// Convert bytes to MB for readability
	allocMB := float64(m.Alloc) / 1024 / 1024
	totalAllocMB := float64(m.TotalAlloc) / 1024 / 1024
	sysMB := float64(m.Sys) / 1024 / 1024
	
	fmt.Printf("Memory usage: Alloc=%.2fMB, TotalAlloc=%.2fMB, Sys=%.2fMB, NumGC=%d\n",
		allocMB, totalAllocMB, sysMB, m.NumGC)
	
	if memSink != nil {
		memSinkLock.Lock()
		leakMB := 0.0
		for _, data := range memSink {
			leakMB += float64(len(data)) / 1024 / 1024
		}
		fmt.Printf("Leak simulation buffer: %.2fMB in %d chunks\n", leakMB, len(memSink))
		memSinkLock.Unlock()
	}
}