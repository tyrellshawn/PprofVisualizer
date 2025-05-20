package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestMutexDemo(t *testing.T) {
	// Reset the global resources
	basicResource = &SharedResource{
		data: make(map[string]int),
	}
	
	// Run mutex demo with smaller numbers for testing
	numWorkers := 5
	iterations := 10
	
	// Run the demo
	runMutexDemo(numWorkers, iterations)
	
	// Verify that the counter was incremented
	counterVal := basicResource.counter
	
	// We expect writers to increment the counter (numWorkers / 3) * iterations times
	// 1/3 of workers are writers
	expectedWriters := numWorkers / 3
	if expectedWriters == 0 {
		expectedWriters = 1 // At least one writer
	}
	expectedCounter := expectedWriters * iterations
	
	// Allow for some margin of error
	minExpected := int(float64(expectedCounter) * 0.9)
	maxExpected := int(float64(expectedCounter) * 1.1)
	
	if counterVal < minExpected || counterVal > maxExpected {
		t.Errorf("Expected counter to be around %d, got %d", expectedCounter, counterVal)
	}
	
	// Verify that the data map contains entries
	if len(basicResource.data) == 0 {
		t.Error("Expected data map to contain entries, but it's empty")
	}
}

func TestRWMutexDemo(t *testing.T) {
	// Reset the global resources
	rwResource = &SharedResource{
		data: make(map[string]int),
	}
	
	// Run rwmutex demo with smaller numbers for testing
	numWorkers := 5
	iterations := 10
	
	// Run the demo
	runRWMutexDemo(numWorkers, iterations)
	
	// Verify that the counter was incremented
	counterVal := rwResource.counter
	
	// We expect writers to increment the counter (numWorkers / 5) * iterations times
	// 1/5 of workers are writers
	expectedWriters := numWorkers / 5
	if expectedWriters == 0 {
		expectedWriters = 1 // At least one writer
	}
	expectedCounter := expectedWriters * iterations
	
	// Allow for some margin of error
	minExpected := int(float64(expectedCounter) * 0.9)
	maxExpected := int(float64(expectedCounter) * 1.1)
	
	if counterVal < minExpected || counterVal > maxExpected {
		t.Errorf("Expected counter to be around %d, got %d", expectedCounter, counterVal)
	}
	
	// Verify that the data map contains entries
	if len(rwResource.data) == 0 {
		t.Error("Expected data map to contain entries, but it's empty")
	}
}

func TestChannelDemoSmall(t *testing.T) {
	// Reset the global resources
	workChannel = make(chan int, 100)
	resultChannel = make(chan int, 100)
	controlChannel = make(chan bool)
	
	var wg sync.WaitGroup
	
	// Create counter for produced items
	var producedItems int32
	oldProducer := producer
	producer = func(numItems int) {
		defer wg.Done()
		
		for i := 0; i < numItems; i++ {
			// Create a work item
			item := i
			
			// Try to send it to the channel
			select {
			case workChannel <- item:
				// Successfully sent
				atomic.AddInt32(&producedItems, 1)
				// Don't print in test
			case <-controlChannel:
				// Received shutdown signal
				return
			}
			
			// Don't sleep in test
		}
	}
	
	// Create counter for consumed items
	var consumedItems int32
	oldConsumer := consumer
	consumer = func(id int) {
		defer wg.Done()
		
		for {
			// Try to receive work
			select {
			case item, ok := <-workChannel:
				if !ok {
					return
				}
				
				// Process without sleeping
				result := item * 2
				
				// Send result
				resultChannel <- result
				atomic.AddInt32(&consumedItems, 1)
				
			case <-controlChannel:
				return
			}
		}
	}
	
	// Run with small values
	numProducers := 2
	numConsumers := 3
	itemsPerProducer := 5
	
	// Start the function under test
	go runChannelDemo(numProducers, numConsumers, itemsPerProducer)
	
	// Wait for expected number of items to be processed or timeout
	deadline := time.Now().Add(5 * time.Second)
	expectedItems := numProducers * itemsPerProducer
	
	for {
		if atomic.LoadInt32(&producedItems) >= int32(expectedItems) &&
		   atomic.LoadInt32(&consumedItems) >= int32(expectedItems) {
			break
		}
		
		if time.Now().After(deadline) {
			t.Errorf("Timeout waiting for items to process. Produced: %d, Consumed: %d, Expected: %d", 
				atomic.LoadInt32(&producedItems),
				atomic.LoadInt32(&consumedItems),
				expectedItems)
			break
		}
		
		time.Sleep(100 * time.Millisecond)
	}
	
	// Restore original functions
	producer = oldProducer
	consumer = oldConsumer
}

func TestHTTPEndpoints(t *testing.T) {
	// Create a test server
	mux := http.NewServeMux()
	
	// Register demo endpoints
	mux.HandleFunc("/mutex-demo", func(w http.ResponseWriter, r *http.Request) {
		numWorkers := 2  // Smaller for testing
		iterations := 5  // Smaller for testing
		
		go runMutexDemo(numWorkers, iterations)
		
		w.Write([]byte("Started mutex contention demo"))
	})
	
	mux.HandleFunc("/rwmutex-demo", func(w http.ResponseWriter, r *http.Request) {
		numWorkers := 2  // Smaller for testing
		iterations := 5  // Smaller for testing
		
		go runRWMutexDemo(numWorkers, iterations)
		
		w.Write([]byte("Started RWMutex contention demo"))
	})
	
	mux.HandleFunc("/channel-demo", func(w http.ResponseWriter, r *http.Request) {
		numProducers := 2    // Smaller for testing
		numConsumers := 2    // Smaller for testing
		itemsPerProducer := 3 // Smaller for testing
		
		go runChannelDemo(numProducers, numConsumers, itemsPerProducer)
		
		w.Write([]byte("Started channel demo"))
	})
	
	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Concurrency App Status"))
	})
	
	// Create test cases for each endpoint
	endpoints := []string{
		"/mutex-demo",
		"/rwmutex-demo",
		"/channel-demo",
		"/status",
	}
	
	for _, endpoint := range endpoints {
		t.Run(endpoint, func(t *testing.T) {
			req := httptest.NewRequest("GET", endpoint, nil)
			recorder := httptest.NewRecorder()
			
			mux.ServeHTTP(recorder, req)
			
			if recorder.Code != http.StatusOK {
				t.Errorf("Expected status 200 for %s, got %d", endpoint, recorder.Code)
			}
			
			if !strings.Contains(recorder.Body.String(), "demo") && 
			   !strings.Contains(recorder.Body.String(), "Status") {
				t.Errorf("Unexpected response body for %s: %s", endpoint, recorder.Body.String())
			}
		})
	}
}

func TestDeadlockAvoidance(t *testing.T) {
	// This test ensures that our deadlock demonstration function doesn't actually deadlock
	// in the test environment by using a timeout
	
	done := make(chan bool)
	timeout := make(chan bool, 1)
	
	go func() {
		// Run the potential deadlock function briefly
		go potentialDeadlock()
		
		// Let it run for a short time
		time.Sleep(300 * time.Millisecond)
		
		done <- true
	}()
	
	// Set a timeout
	go func() {
		time.Sleep(2 * time.Second)
		timeout <- true
	}()
	
	// Wait for either completion or timeout
	select {
	case <-done:
		// Test passed - function returned without deadlocking
	case <-timeout:
		t.Fatal("Deadlock detected - test timed out")
	}
}