package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"net/http/pprof"
	"runtime"
	"sync"
	"time"
)

// A concurrency-focused application to demonstrate block and mutex profiles
// Useful for generating block and mutex profiles for visualization

// Shared resource that will be accessed concurrently
type SharedResource struct {
	data    map[string]int
	counter int
	mutex   sync.Mutex
	rwMutex sync.RWMutex
}

// Global shared resources
var (
	// Basic mutex protected resource
	basicResource = &SharedResource{
		data: make(map[string]int),
	}

	// RWMutex protected resource
	rwResource = &SharedResource{
		data: make(map[string]int),
	}

	// Channels for different patterns
	workChannel  = make(chan int, 100)  // Buffered channel
	resultChannel = make(chan int, 100) // Buffered channel
	controlChannel = make(chan bool)    // Unbuffered control channel
	
	// WaitGroup for coordination
	wg sync.WaitGroup
)

// Write to the shared resource with a regular mutex (high contention)
func writeWithMutex(id int, iterations int) {
	defer wg.Done()
	
	for i := 0; i < iterations; i++ {
		// Simulate some work before acquiring the lock
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(5)))
		
		basicResource.mutex.Lock()
		// Critical section - intentionally sleep while holding the lock to create contention
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(10)))
		
		// Update data
		key := fmt.Sprintf("worker-%d", id)
		basicResource.data[key] = basicResource.data[key] + 1
		basicResource.counter++
		
		basicResource.mutex.Unlock()
	}
}

// Read from the shared resource with a regular mutex (high contention)
func readWithMutex(id int, iterations int) {
	defer wg.Done()
	
	for i := 0; i < iterations; i++ {
		// Simulate some work before acquiring the lock
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(3)))
		
		basicResource.mutex.Lock()
		// Just read the data
		key := fmt.Sprintf("worker-%d", id % 5) // Read from a limited set of keys
		_ = basicResource.data[key]
		_ = basicResource.counter
		
		basicResource.mutex.Unlock()
	}
}

// Write to the shared resource with a RWMutex (lower contention for readers)
func writeWithRWMutex(id int, iterations int) {
	defer wg.Done()
	
	for i := 0; i < iterations; i++ {
		// Simulate some work before acquiring the lock
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(5)))
		
		rwResource.rwMutex.Lock()
		// Critical section - intentionally sleep while holding the lock to create contention
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(10)))
		
		// Update data
		key := fmt.Sprintf("worker-%d", id)
		rwResource.data[key] = rwResource.data[key] + 1
		rwResource.counter++
		
		rwResource.rwMutex.Unlock()
	}
}

// Read from the shared resource with a RWMutex (lower contention)
func readWithRWMutex(id int, iterations int) {
	defer wg.Done()
	
	for i := 0; i < iterations; i++ {
		// Simulate some work before acquiring the lock
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(3)))
		
		rwResource.rwMutex.RLock() // Note: RLock for reading
		// Just read the data
		key := fmt.Sprintf("worker-%d", id % 5) // Read from a limited set of keys
		_ = rwResource.data[key]
		_ = rwResource.counter
		
		rwResource.rwMutex.RUnlock()
	}
}

// Worker that produces work items
func producer(numItems int) {
	defer wg.Done()
	
	for i := 0; i < numItems; i++ {
		// Create a work item
		item := rand.Intn(100)
		
		// Try to send it to the channel - this will block if channel is full
		select {
		case workChannel <- item:
			// Successfully sent
			fmt.Printf("Produced: %d\n", item)
		case <-controlChannel:
			// Received shutdown signal
			fmt.Println("Producer received shutdown signal")
			return
		}
		
		// Simulate variable production rate
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(10)))
	}
}

// Worker that consumes work items
func consumer(id int) {
	defer wg.Done()
	
	for {
		// Try to receive work - this will block if channel is empty
		select {
		case item, ok := <-workChannel:
			if !ok {
				// Channel closed
				fmt.Printf("Consumer %d: channel closed\n", id)
				return
			}
			
			// Process the item (simulated work)
			time.Sleep(time.Millisecond * time.Duration(rand.Intn(20)))
			result := item * 2
			
			// Send result
			resultChannel <- result
			fmt.Printf("Consumer %d: processed %d -> %d\n", id, item, result)
			
		case <-controlChannel:
			// Received shutdown signal
			fmt.Printf("Consumer %d received shutdown signal\n", id)
			return
		}
	}
}

// Function that might deadlock (for demonstration)
func potentialDeadlock() {
	var mutex1, mutex2 sync.Mutex
	
	// Create two goroutines that acquire locks in opposite order
	go func() {
		for {
			mutex1.Lock()
			time.Sleep(time.Millisecond)
			mutex2.Lock()
			
			// Critical section
			time.Sleep(time.Millisecond * 10)
			
			mutex2.Unlock()
			mutex1.Unlock()
			
			time.Sleep(time.Millisecond * 100)
		}
	}()
	
	go func() {
		for {
			// This creates a potential deadlock - acquiring locks in opposite order
			mutex2.Lock()
			time.Sleep(time.Millisecond)
			mutex1.Lock()
			
			// Critical section
			time.Sleep(time.Millisecond * 10)
			
			mutex1.Unlock()
			mutex2.Unlock()
			
			time.Sleep(time.Millisecond * 100)
		}
	}()
}

// Run mutex contention demo
func runMutexDemo(numWorkers, iterations int) {
	fmt.Printf("Starting mutex demo with %d workers, %d iterations each\n", numWorkers, iterations)
	
	// Start a mix of readers and writers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		if i % 3 == 0 {
			// 1/3 of workers write
			go writeWithMutex(i, iterations)
		} else {
			// 2/3 of workers read
			go readWithMutex(i, iterations)
		}
	}
	
	// Wait for all workers to finish
	wg.Wait()
	
	fmt.Println("Mutex demo completed")
	fmt.Printf("Final counter value: %d\n", basicResource.counter)
}

// Run RWMutex contention demo
func runRWMutexDemo(numWorkers, iterations int) {
	fmt.Printf("Starting RWMutex demo with %d workers, %d iterations each\n", numWorkers, iterations)
	
	// Start a mix of readers and writers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		if i % 5 == 0 {
			// 1/5 of workers write
			go writeWithRWMutex(i, iterations)
		} else {
			// 4/5 of workers read
			go readWithRWMutex(i, iterations)
		}
	}
	
	// Wait for all workers to finish
	wg.Wait()
	
	fmt.Println("RWMutex demo completed")
	fmt.Printf("Final counter value: %d\n", rwResource.counter)
}

// Run channel blocking demo
func runChannelDemo(numProducers, numConsumers, itemsPerProducer int) {
	fmt.Printf("Starting channel demo with %d producers and %d consumers\n", 
		numProducers, numConsumers)
	
	// Start producers
	for i := 0; i < numProducers; i++ {
		wg.Add(1)
		go producer(itemsPerProducer)
	}
	
	// Start consumers
	for i := 0; i < numConsumers; i++ {
		wg.Add(1)
		go consumer(i)
	}
	
	// Wait for all producers to finish
	time.Sleep(time.Second * 5)
	
	// Signal all workers to stop
	for i := 0; i < numProducers + numConsumers; i++ {
		controlChannel <- true
	}
	
	// Wait for all workers to finish
	wg.Wait()
	
	// Count remaining items
	close(workChannel)
	close(resultChannel)
	
	var remainingWork, results int
	for range workChannel {
		remainingWork++
	}
	for range resultChannel {
		results++
	}
	
	fmt.Println("Channel demo completed")
	fmt.Printf("Remaining work items: %d\n", remainingWork)
	fmt.Printf("Results collected: %d\n", results)
}

func main() {
	// Seed random number generator
	rand.Seed(time.Now().UnixNano())
	
	// Create HTTP server for pprof
	mux := http.NewServeMux()
	
	// Register pprof handlers
	mux.HandleFunc("/debug/pprof/", pprof.Index)
	mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
	mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
	
	// Register demo endpoints
	mux.HandleFunc("/mutex-demo", func(w http.ResponseWriter, r *http.Request) {
		numWorkers := 10   // Default
		iterations := 100  // Default
		
		go runMutexDemo(numWorkers, iterations)
		
		fmt.Fprintf(w, "Started mutex contention demo with %d workers, %d iterations each\n", 
			numWorkers, iterations)
	})
	
	mux.HandleFunc("/rwmutex-demo", func(w http.ResponseWriter, r *http.Request) {
		numWorkers := 20   // Default
		iterations := 100  // Default
		
		go runRWMutexDemo(numWorkers, iterations)
		
		fmt.Fprintf(w, "Started RWMutex contention demo with %d workers, %d iterations each\n", 
			numWorkers, iterations)
	})
	
	mux.HandleFunc("/channel-demo", func(w http.ResponseWriter, r *http.Request) {
		numProducers := 3    // Default
		numConsumers := 5    // Default
		itemsPerProducer := 50 // Default
		
		go runChannelDemo(numProducers, numConsumers, itemsPerProducer)
		
		fmt.Fprintf(w, "Started channel demo with %d producers and %d consumers\n", 
			numProducers, numConsumers)
	})
	
	// Deadlock demo (potentially dangerous)
	mux.HandleFunc("/deadlock-demo", func(w http.ResponseWriter, r *http.Request) {
		go potentialDeadlock()
		fmt.Fprintf(w, "Started potential deadlock demo\n")
	})
	
	// Status endpoint
	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Concurrency App Status\n")
		fmt.Fprintf(w, "--------------------\n")
		fmt.Fprintf(w, "Goroutines: %d\n", runtime.NumGoroutine())
		
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		fmt.Fprintf(w, "Alloc: %v MiB\n", m.Alloc/1024/1024)
		fmt.Fprintf(w, "TotalAlloc: %v MiB\n", m.TotalAlloc/1024/1024)
		fmt.Fprintf(w, "Sys: %v MiB\n", m.Sys/1024/1024)
		fmt.Fprintf(w, "NumGC: %v\n", m.NumGC)
	})
	
	// Start the server
	fmt.Println("Starting concurrency demo server on :8082")
	fmt.Println("Available endpoints:")
	fmt.Println("  /mutex-demo - Run Mutex contention demo")
	fmt.Println("  /rwmutex-demo - Run RWMutex contention demo")
	fmt.Println("  /channel-demo - Run channel blocking demo")
	fmt.Println("  /deadlock-demo - Run potential deadlock demo")
	fmt.Println("  /status - View runtime stats")
	fmt.Println("  /debug/pprof/ - pprof endpoint")
	
	http.ListenAndServe(":8082", mux)
}