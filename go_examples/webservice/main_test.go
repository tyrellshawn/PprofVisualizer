package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestProductsEndpoint(t *testing.T) {
	// Create a new database with sample data
	db := NewDatabase()
	
	// Create a new server mux
	mux := http.NewServeMux()
	
	// Register the products endpoint
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
	
	// Create a request to the products endpoint
	req := httptest.NewRequest("GET", "/api/products", nil)
	recorder := httptest.NewRecorder()
	
	// Serve the request
	mux.ServeHTTP(recorder, req)
	
	// Check the status code
	if recorder.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, recorder.Code)
	}
	
	// Decode the response
	var products []Product
	if err := json.Unmarshal(recorder.Body.Bytes(), &products); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}
	
	// Verify the response
	if len(products) != 1000 {
		t.Errorf("Expected 1000 products, got %d", len(products))
	}
}

func TestSearchEndpoint(t *testing.T) {
	// Create a new database with sample data
	db := NewDatabase()
	
	// Create a new server mux
	mux := http.NewServeMux()
	
	// Register the search endpoint
	mux.HandleFunc("/api/search", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			http.Error(w, "Missing query parameter", http.StatusBadRequest)
			return
		}
		
		db.mutex.RLock()
		defer db.mutex.RUnlock()
		
		results := make([]Product, 0)
		
		for _, product := range db.products {
			matches := false
			
			if containsIgnoreCase(product.Name, query) {
				matches = true
			}
			
			if containsIgnoreCase(product.Description, query) {
				matches = true
			}
			
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
	
	testCases := []struct {
		name          string
		query         string
		expectedCode  int
		checkResponse func(t *testing.T, body []byte)
	}{
		{
			name:         "Valid search",
			query:        "product",
			expectedCode: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var results []Product
				if err := json.Unmarshal(body, &results); err != nil {
					t.Errorf("Failed to decode response: %v", err)
				}
				
				if len(results) == 0 {
					t.Error("Expected search results, got none")
				}
				
				for _, result := range results {
					if !strings.Contains(strings.ToLower(result.Name), "product") {
						if !strings.Contains(strings.ToLower(result.Description), "product") {
							matchFound := false
							for _, cat := range result.Categories {
								if strings.Contains(strings.ToLower(cat), "product") {
									matchFound = true
									break
								}
							}
							if !matchFound {
								t.Errorf("Result %s doesn't contain search term 'product'", result.Name)
							}
						}
					}
				}
			},
		},
		{
			name:         "Missing query",
			query:        "",
			expectedCode: http.StatusBadRequest,
			checkResponse: func(t *testing.T, body []byte) {
				if !strings.Contains(string(body), "Missing query parameter") {
					t.Errorf("Expected error message for missing query, got: %s", string(body))
				}
			},
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create a request to the search endpoint
			url := "/api/search"
			if tc.query != "" {
				url += "?q=" + tc.query
			}
			req := httptest.NewRequest("GET", url, nil)
			recorder := httptest.NewRecorder()
			
			// Serve the request
			mux.ServeHTTP(recorder, req)
			
			// Check the status code
			if recorder.Code != tc.expectedCode {
				t.Errorf("Expected status code %d, got %d", tc.expectedCode, recorder.Code)
			}
			
			// Check the response body
			tc.checkResponse(t, recorder.Body.Bytes())
		})
	}
}

func TestContainsIgnoreCase(t *testing.T) {
	testCases := []struct {
		s        string
		substr   string
		expected bool
	}{
		{"Hello World", "hello", true},
		{"Hello World", "WORLD", true},
		{"Hello World", "universe", false},
		{"", "test", false},
		{"test", "", true},
		{"AbCdEf", "CDe", true},
	}
	
	for _, tc := range testCases {
		result := containsIgnoreCase(tc.s, tc.substr)
		if result != tc.expected {
			t.Errorf("containsIgnoreCase(%q, %q) = %v, expected %v", 
				tc.s, tc.substr, result, tc.expected)
		}
	}
}

func TestToLower(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"HELLO", "hello"},
		{"Hello", "hello"},
		{"hello", "hello"},
		{"123", "123"},
		{"HeLlO123", "hello123"},
		{"", ""},
	}
	
	for _, tc := range testCases {
		result := toLower(tc.input)
		if result != tc.expected {
			t.Errorf("toLower(%q) = %q, expected %q", tc.input, result, tc.expected)
		}
	}
}

func TestContains(t *testing.T) {
	testCases := []struct {
		s        string
		substr   string
		expected bool
	}{
		{"hello world", "hello", true},
		{"hello world", "world", true},
		{"hello world", "universe", false},
		{"", "test", false},
		{"test", "", true},
		{"abcdef", "cde", true},
	}
	
	for _, tc := range testCases {
		result := contains(tc.s, tc.substr)
		if result != tc.expected {
			t.Errorf("contains(%q, %q) = %v, expected %v", 
				tc.s, tc.substr, result, tc.expected)
		}
	}
}