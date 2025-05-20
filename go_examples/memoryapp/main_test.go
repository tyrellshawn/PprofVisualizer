package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestMemoryHandler(t *testing.T) {
	// Create a new server mux
	mux := http.NewServeMux()
	
	// Register memory handler
	mux.HandleFunc("/allocate", memoryHandler)
	
	testCases := []struct {
		name           string
		url            string
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Default allocation",
			url:            "/allocate",
			expectedStatus: http.StatusOK,
			expectedBody:   "Memory allocated: 1048576 bytes",
		},
		{
			name:           "Custom size allocation",
			url:            "/allocate?size=2097152", // 2MB
			expectedStatus: http.StatusOK, 
			expectedBody:   "Memory allocated: 2097152 bytes",
		},
		{
			name:           "Invalid size parameter",
			url:            "/allocate?size=invalid",
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "Invalid size parameter",
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create a request
			req := httptest.NewRequest("GET", tc.url, nil)
			recorder := httptest.NewRecorder()
			
			// Serve the request
			mux.ServeHTTP(recorder, req)
			
			// Check status code
			if recorder.Code != tc.expectedStatus {
				t.Errorf("Expected status code %d, got %d", tc.expectedStatus, recorder.Code)
			}
			
			// Check response body contains expected text
			if !strings.Contains(recorder.Body.String(), tc.expectedBody) {
				t.Errorf("Response body doesn't contain expected text.\nExpected to contain: %s\nGot: %s", 
					tc.expectedBody, recorder.Body.String())
			}
		})
	}
}

func TestObjectPool(t *testing.T) {
	// Create a new object pool
	pool := NewObjectPool()
	
	// Get an object from the pool
	obj1 := pool.Get()
	
	// Verify the object is initialized
	if obj1 == nil {
		t.Fatal("Expected object from pool, got nil")
	}
	
	if len(obj1.Data) != 1024*1024 {
		t.Errorf("Expected 1MB buffer, got %d bytes", len(obj1.Data))
	}
	
	// Modify the object
	obj1.ID = 42
	obj1.Name = "TestObject"
	
	// Return it to the pool
	pool.Put(obj1)
	
	// Get another object and verify it's the same (reused)
	obj2 := pool.Get()
	
	// The ID and Name should be preserved since we're reusing the same object
	if obj2.ID != 42 || obj2.Name != "TestObject" {
		t.Errorf("Object pool not reusing objects properly: expected ID=42, Name=TestObject, got ID=%d, Name=%s",
			obj2.ID, obj2.Name)
	}
}

func TestLargeObjectCreation(t *testing.T) {
	// Test creating a large object with different depths
	depths := []int{0, 1, 2}
	
	for _, depth := range depths {
		t.Run("Depth="+string('0'+depth), func(t *testing.T) {
			obj := createLargeObject(1, depth)
			
			// Basic validation
			if obj == nil {
				t.Fatal("createLargeObject returned nil")
			}
			
			if obj.ID != 1 {
				t.Errorf("Expected ID=1, got %d", obj.ID)
			}
			
			if len(obj.Data) != 1024*1024 {
				t.Errorf("Expected 1MB data, got %d bytes", len(obj.Data))
			}
			
			// Validate children based on depth
			if depth == 0 && len(obj.Children) > 0 {
				t.Errorf("Expected no children at depth 0, got %d", len(obj.Children))
			}
			
			if depth > 0 && len(obj.Children) == 0 {
				t.Errorf("Expected children at depth %d, got none", depth)
			}
			
			// Validate depth of child hierarchy
			if depth > 0 {
				for _, child := range obj.Children {
					// At depth 1, children should have no grandchildren
					if depth == 1 && len(child.Children) > 0 {
						t.Errorf("Expected no grandchildren at depth 1, got %d", len(child.Children))
					}
				}
			}
		})
	}
}

func TestSimulateMemoryLeak(t *testing.T) {
	// Use a short interval for testing
	interval := 50 * time.Millisecond
	
	// Reset the global cache for this test
	globalCache = make(map[string]*LargeObject)
	
	// Start the leak simulation
	simulateMemoryLeak(interval)
	
	// Wait for a few intervals
	time.Sleep(interval * 3)
	
	// Check that the cache is growing
	cacheMutex.RLock()
	cacheSize := len(globalCache)
	cacheMutex.RUnlock()
	
	if cacheSize < 2 {
		t.Errorf("Expected globalCache to grow, but size is only %d", cacheSize)
	}
}

func TestRandomString(t *testing.T) {
	lengths := []int{0, 10, 100}
	
	for _, length := range lengths {
		t.Run("Length="+string(length), func(t *testing.T) {
			s := randomString(length)
			
			if len(s) != length {
				t.Errorf("randomString(%d) returned string of length %d", length, len(s))
			}
			
			// For non-empty strings, check that they contain only valid characters
			if length > 0 {
				const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
				for i, c := range s {
					if !strings.ContainsRune(charset, c) {
						t.Errorf("randomString(%d) contains invalid character %c at position %d", 
							length, c, i)
						break
					}
				}
			}
		})
	}
}