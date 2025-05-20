package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"net/http/pprof"
	"os"
	"runtime"
	"sync"
	"time"
)

// Product represents a product data model
type Product struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Price       float64  `json:"price"`
	Description string   `json:"description"`
	Categories  []string `json:"categories"`
	Rating      float64  `json:"rating"`
	ReviewCount int      `json:"reviewCount"`
}

// Database is a simple in-memory database
type Database struct {
	products map[int]Product
	mutex    sync.RWMutex
}

// NewDatabase creates a new database with sample data
func NewDatabase() *Database {
	db := &Database{
		products: make(map[int]Product),
	}

	// Generate sample products
	categories := []string{"Electronics", "Books", "Clothing", "Home", "Toys"}
	for i := 1; i <= 1000; i++ {
		db.products[i] = Product{
			ID:          i,
			Name:        fmt.Sprintf("Product %d", i),
			Price:       rand.Float64() * 1000,
			Description: generateRandomText(200),
			Categories:  randomCategories(categories),
			Rating:      rand.Float64() * 5,
			ReviewCount: rand.Intn(1000),
		}
	}

	return db
}

// generateRandomText generates a random text of n characters
func generateRandomText(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 "
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

// randomCategories returns random categories
func randomCategories(categories []string) []string {
	numCategories := rand.Intn(3) + 1
	selectedCategories := make([]string, numCategories)
	
	for i := 0; i < numCategories; i++ {
		selectedCategories[i] = categories[rand.Intn(len(categories))]
	}
	
	return selectedCategories
}

func main() {
	// Seed random number generator
	rand.Seed(time.Now().UnixNano())
	
	// Create a new database
	db := NewDatabase()
	
	// Create a new server mux
	mux := http.NewServeMux()
	
	// Add pprof handlers
	mux.HandleFunc("/debug/pprof/", pprof.Index)
	mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
	mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
	
	// API endpoints
	mux.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		db.mutex.RLock()
		defer db.mutex.RUnlock()
		
		products := make([]Product, 0, len(db.products))
		for _, product := range db.products {
			products = append(products, product)
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(products)
	})
	
	mux.HandleFunc("/api/products/", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Path[len("/api/products/"):]
		var productID int
		fmt.Sscanf(id, "%d", &productID)
		
		db.mutex.RLock()
		defer db.mutex.RUnlock()
		
		product, ok := db.products[productID]
		if !ok {
			http.NotFound(w, r)
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(product)
	})
	
	// Search endpoint (CPU intensive)
	mux.HandleFunc("/api/search", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			http.Error(w, "Missing query parameter", http.StatusBadRequest)
			return
		}
		
		db.mutex.RLock()
		defer db.mutex.RUnlock()
		
		results := make([]Product, 0)
		
		// Intentionally inefficient search to generate CPU load
		for _, product := range db.products {
			// Simple string matching
			matches := false
			
			// Check name
			if containsIgnoreCase(product.Name, query) {
				matches = true
			}
			
			// Check description (inefficient)
			if containsIgnoreCase(product.Description, query) {
				matches = true
			}
			
			// Check categories (inefficient)
			for _, category := range product.Categories {
				if containsIgnoreCase(category, query) {
					matches = true
					break
				}
			}
			
			if matches {
				results = append(results, product)
			}
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	})
	
	// Load test endpoint
	mux.HandleFunc("/api/loadtest", func(w http.ResponseWriter, r *http.Request) {
		iterations := 1000000
		result := 0
		
		// CPU-bound work
		for i := 0; i < iterations; i++ {
			result += i * i
		}
		
		// Memory allocation
		data := make([]byte, 10*1024*1024) // 10MB
		for i := range data {
			data[i] = byte(rand.Intn(256))
		}
		
		fmt.Fprintf(w, "Load test completed: %d\n", result)
	})
	
	// Status endpoint
	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Server is running\n")
		fmt.Fprintf(w, "NumGoroutine: %d\n", runtime.NumGoroutine())
		
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		fmt.Fprintf(w, "Alloc: %v MiB\n", m.Alloc/1024/1024)
		fmt.Fprintf(w, "TotalAlloc: %v MiB\n", m.TotalAlloc/1024/1024)
		fmt.Fprintf(w, "Sys: %v MiB\n", m.Sys/1024/1024)
		fmt.Fprintf(w, "NumGC: %v\n", m.NumGC)
	})
	
	// Get the port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	// Start the server
	serverAddr := ":" + port
	fmt.Printf("Starting server on %s\n", serverAddr)
	fmt.Printf("pprof enabled at /debug/pprof/\n")
	log.Fatal(http.ListenAndServe(serverAddr, mux))
}

// containsIgnoreCase checks if a string contains a substring, ignoring case
func containsIgnoreCase(s, substr string) bool {
	s, substr = toLower(s), toLower(substr)
	return contains(s, substr)
}

// toLower converts a string to lowercase
func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 32
		}
		result[i] = c
	}
	return string(result)
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}