package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	_ "net/http/pprof" // Import pprof for automatic HTTP profiling endpoints
	"runtime"
	"sync"
	"time"
)

// User represents a user in our system
type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	Data      []byte    `json:"data,omitempty"`
}

// Global variables
var (
	users     = make(map[int]*User)
	userMutex = &sync.RWMutex{}
	userCache = make(map[int]*User)
	cacheMu   = &sync.RWMutex{}
)

func main() {
	// Enable CPU and memory profiling
	runtime.SetBlockProfileRate(1)
	runtime.SetMutexProfileFraction(1)

	// Pre-populate with some users
	for i := 1; i <= 1000; i++ {
		users[i] = &User{
			ID:        i,
			Name:      fmt.Sprintf("User %d", i),
			Email:     fmt.Sprintf("user%d@example.com", i),
			CreatedAt: time.Now().Add(-time.Duration(rand.Intn(10000)) * time.Hour),
			Data:      make([]byte, 1024*i%50), // Varying sizes to create memory patterns
		}
	}

	// API routes
	http.HandleFunc("/users", getAllUsers)
	http.HandleFunc("/users/", getUser)
	http.HandleFunc("/search", searchUsers)
	http.HandleFunc("/compute", computeExpensive)

	// Start server
	fmt.Println("Starting server at :6060")
	fmt.Println("Profile endpoints available at: http://localhost:6060/debug/pprof/")
	fmt.Println("To capture a 30s CPU profile: http://localhost:6060/debug/pprof/profile")
	fmt.Println("To view heap profile: http://localhost:6060/debug/pprof/heap")
	fmt.Println("To view goroutine profile: http://localhost:6060/debug/pprof/goroutine")
	fmt.Println("To view block profile: http://localhost:6060/debug/pprof/block")
	fmt.Println("To view mutex profile: http://localhost:6060/debug/pprof/mutex")
	log.Fatal(http.ListenAndServe(":6060", nil))
}

// getAllUsers returns all users (potentially memory intensive)
func getAllUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userMutex.RLock()
	defer userMutex.RUnlock()

	// This creates a new array each time, which is memory intensive on large datasets
	userList := make([]*User, 0, len(users))
	for _, u := range users {
		userList = append(userList, u)
	}

	// Simulate data processing
	processUserData(userList)

	// Marshal and send response
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(userList)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// getUser returns a specific user by ID
func getUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse ID from URL
	var id int
	_, err := fmt.Sscanf(r.URL.Path, "/users/%d", &id)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Check cache first (demonstrates mutex contention when many concurrent requests)
	cacheMu.RLock()
	if cachedUser, found := userCache[id]; found {
		cacheMu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cachedUser)
		return
	}
	cacheMu.RUnlock()

	// Not in cache, get from main storage
	userMutex.RLock()
	user, found := users[id]
	userMutex.RUnlock()

	if !found {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Add to cache
	cacheMu.Lock()
	userCache[id] = user
	cacheMu.Unlock()

	// Marshal and send response
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// searchUsers searches for users (CPU intensive)
func searchUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	// CPU-intensive operation
	results := make([]*User, 0)
	userMutex.RLock()
	for _, u := range users {
		// Inefficient string search algorithm to generate CPU load
		if inefficientContains(u.Name, query) || inefficientContains(u.Email, query) {
			results = append(results, u)
		}
	}
	userMutex.RUnlock()

	// Marshal and send response
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(results)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// computeExpensive performs an expensive computation (CPU intensive)
func computeExpensive(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Simulate a complex computation
	start := time.Now()
	result := expensiveComputation(20)
	duration := time.Since(start)

	// Return the result
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"result":   result,
		"duration": duration.String(),
	})
}

// Helper functions that generate CPU/memory/mutex contention

// processUserData simulates data processing on user records
func processUserData(users []*User) {
	var wg sync.WaitGroup
	for _, u := range users {
		wg.Add(1)
		go func(user *User) {
			defer wg.Done()
			// Simulate processing that creates garbage
			data := make([]byte, 1024)
			for i := range data {
				data[i] = byte(rand.Intn(256))
			}
			user.Data = data
		}(u)
	}
	wg.Wait()
}

// inefficientContains is an inefficient string search to generate CPU load
func inefficientContains(haystack, needle string) bool {
	if len(needle) == 0 {
		return true
	}
	
	// Intentionally inefficient algorithm
	for i := 0; i <= len(haystack)-len(needle); i++ {
		match := true
		for j := 0; j < len(needle); j++ {
			if haystack[i+j] != needle[j] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

// expensiveComputation performs a CPU-intensive computation
func expensiveComputation(n int) int {
	if n <= 1 {
		return 1
	}
	// Intentionally inefficient algorithm
	return expensiveComputation(n-1) + expensiveComputation(n-2)
}