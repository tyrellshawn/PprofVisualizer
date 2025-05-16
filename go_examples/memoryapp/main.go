package main

import (
        "fmt"
        "math/rand"
        "net/http"
        "net/http/pprof"
        "runtime"
        "strings"
        "sync"
        "time"
)

// A memory-intensive application that demonstrates different memory allocation patterns
// Useful for generating heap profiles

// LargeObject represents a memory-intensive data structure
type LargeObject struct {
        ID       int
        Name     string
        Data     []byte
        Children []*LargeObject
}

// Global cache to demonstrate memory leaks
var globalCache = make(map[string]*LargeObject)
var cacheMutex sync.RWMutex

// Create a large object with nested children
func createLargeObject(id int, depth int) *LargeObject {
        // Create random data payload
        data := make([]byte, 1024*1024) // 1MB of data
        rand.Read(data)

        obj := &LargeObject{
                ID:       id,
                Name:     fmt.Sprintf("Object-%d", id),
                Data:     data,
                Children: make([]*LargeObject, 0),
        }

        // Create child objects (but limit depth to prevent stack overflow)
        if depth > 0 {
                numChildren := rand.Intn(3) + 1
                for i := 0; i < numChildren; i++ {
                        childID := id*10 + i
                        child := createLargeObject(childID, depth-1)
                        obj.Children = append(obj.Children, child)
                }
        }

        return obj
}

// Simulate a memory leak by never cleaning up objects
func simulateMemoryLeak(interval time.Duration) {
        ticker := time.NewTicker(interval)
        go func() {
                var counter int
                for range ticker.C {
                        counter++
                        key := fmt.Sprintf("leak-%d", counter)
                        obj := createLargeObject(counter, 2)

                        cacheMutex.Lock()
                        globalCache[key] = obj
                        cacheMutex.Unlock()

                        // Print current cache size
                        fmt.Printf("Cache size: %d items\n", len(globalCache))

                        // Print memory stats
                        var m runtime.MemStats
                        runtime.ReadMemStats(&m)
                        fmt.Printf("Alloc: %v MiB, TotalAlloc: %v MiB, Sys: %v MiB, NumGC: %v\n",
                                m.Alloc/1024/1024,
                                m.TotalAlloc/1024/1024,
                                m.Sys/1024/1024,
                                m.NumGC)
                }
        }()
}

// HTTP handler that allocates memory on each request
func memoryHandler(w http.ResponseWriter, r *http.Request) {
        size := 1 * 1024 * 1024 // Default 1MB
        if sizeParam := r.URL.Query().Get("size"); sizeParam != "" {
                _, err := fmt.Sscanf(sizeParam, "%d", &size)
                if err != nil {
                        http.Error(w, "Invalid size parameter", http.StatusBadRequest)
                        return
                }
        }

        // Allocate a large slice
        data := make([]byte, size)
        for i := 0; i < len(data); i++ {
                data[i] = byte(rand.Intn(256))
        }

        // Create some string allocations
        var builder strings.Builder
        for i := 0; i < 1000; i++ {
                builder.WriteString(fmt.Sprintf("Line %d: %s\n", i, randomString(100)))
        }

        // Access global cache
        cacheMutex.RLock()
        cacheSize := len(globalCache)
        cacheMutex.RUnlock()

        // Write response
        fmt.Fprintf(w, "Memory allocated: %d bytes\n", size)
        fmt.Fprintf(w, "String built with length: %d\n", builder.Len())
        fmt.Fprintf(w, "Current cache size: %d items\n", cacheSize)

        // Print memory stats
        var m runtime.MemStats
        runtime.ReadMemStats(&m)
        fmt.Fprintf(w, "Alloc: %v MiB\n", m.Alloc/1024/1024)
        fmt.Fprintf(w, "TotalAlloc: %v MiB\n", m.TotalAlloc/1024/1024)
        fmt.Fprintf(w, "Sys: %v MiB\n", m.Sys/1024/1024)
        fmt.Fprintf(w, "NumGC: %v\n", m.NumGC)
}

// Generate a random string
func randomString(length int) string {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        b := make([]byte, length)
        for i := range b {
                b[i] = charset[rand.Intn(len(charset))]
        }
        return string(b)
}

// ObjectPool demonstrates object reuse patterns
type ObjectPool struct {
        pool sync.Pool
}

// NewObjectPool creates a new object pool
func NewObjectPool() *ObjectPool {
        return &ObjectPool{
                pool: sync.Pool{
                        New: func() interface{} {
                                // Create a new object when the pool is empty
                                return &LargeObject{
                                        Data: make([]byte, 1024*1024), // 1MB buffer
                                }
                        },
                },
        }
}

// Get retrieves an object from the pool
func (p *ObjectPool) Get() *LargeObject {
        return p.pool.Get().(*LargeObject)
}

// Put returns an object to the pool
func (p *ObjectPool) Put(obj *LargeObject) {
        p.pool.Put(obj)
}

func main() {
        // Seed random number generator
        rand.Seed(time.Now().UnixNano())

        // Create an object pool for demonstration
        pool := NewObjectPool()

        // HTTP server for triggering memory allocations
        mux := http.NewServeMux()

        // Register pprof handlers
        mux.HandleFunc("/debug/pprof/", pprof.Index)
        mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
        mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
        mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
        mux.HandleFunc("/debug/pprof/trace", pprof.Trace)

        // Memory allocation handler
        mux.HandleFunc("/allocate", memoryHandler)

        // Pool demonstration
        mux.HandleFunc("/pool", func(w http.ResponseWriter, r *http.Request) {
                // Get an object from the pool
                obj := pool.Get()
                
                // Do something with the object
                rand.Read(obj.Data)
                obj.ID = rand.Intn(10000)
                obj.Name = fmt.Sprintf("PooledObject-%d", obj.ID)
                
                // Return the object to the pool when done
                defer pool.Put(obj)
                
                fmt.Fprintf(w, "Used pooled object: %s (ID: %d, Size: %d bytes)\n", 
                        obj.Name, obj.ID, len(obj.Data))
        })

        // Memory leak simulation
        mux.HandleFunc("/start-leak", func(w http.ResponseWriter, r *http.Request) {
                go simulateMemoryLeak(5 * time.Second)
                fmt.Fprintf(w, "Started memory leak simulation (adding items every 5 seconds)\n")
        })

        // Status endpoint
        mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
                cacheMutex.RLock()
                cacheSize := len(globalCache)
                cacheMutex.RUnlock()
                
                fmt.Fprintf(w, "Memory App Status\n")
                fmt.Fprintf(w, "----------------\n")
                fmt.Fprintf(w, "Cache size: %d items\n", cacheSize)
                
                var m runtime.MemStats
                runtime.ReadMemStats(&m)
                fmt.Fprintf(w, "Alloc: %v MiB\n", m.Alloc/1024/1024)
                fmt.Fprintf(w, "TotalAlloc: %v MiB\n", m.TotalAlloc/1024/1024)
                fmt.Fprintf(w, "Sys: %v MiB\n", m.Sys/1024/1024)
                fmt.Fprintf(w, "NumGC: %v\n", m.NumGC)
        })

        // Start the server
        fmt.Println("Starting memory app server on :8081")
        fmt.Println("Available endpoints:")
        fmt.Println("  /allocate - Allocate memory on demand")
        fmt.Println("  /pool - Demonstrate object pooling")
        fmt.Println("  /start-leak - Start memory leak simulation")
        fmt.Println("  /status - View memory stats")
        fmt.Println("  /debug/pprof/ - pprof endpoint")
        
        http.ListenAndServe(":8081", mux)
}