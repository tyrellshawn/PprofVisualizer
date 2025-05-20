# PProfViz - Go pprof Visualization Tool

PProfViz is an open-source tool for visualizing Go pprof profiles with an improved user interface built with replit agent. It provides intuitive visualizations for CPU, memory, block, and mutex profiles.

## Features

- **Profile Visualizations**: Flamegraphs, timeline charts, and top function breakdowns
- **Interactive Analysis**: Click on functions to view detailed stacktraces
- **Profile Management**: Upload, save, and organize your profiles
- **Remote Connections**: Connect to running Go applications to capture profiles
- **Example Profiles**: Includes sample Go programs that generate various profile types

## Project Structure

This project is organized as a monorepo with the following components:

```
/
├── packages/            # Main project packages
│   ├── frontend/        # React-based visualization UI
│   ├── backend/         # Express server for profile handling
│   └── shared/          # Shared types and utilities
├── go_examples/         # Example Go programs for profile generation
│   ├── webservice/      # Web API with CPU-intensive endpoints
│   ├── memoryapp/       # Memory allocation demonstration
│   ├── concurrency/     # Mutex and blocking examples
│   └── generate_profiles.sh # Script to generate example profiles
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser to http://localhost:5000

## Go Example Programs

The `go_examples` directory contains Go applications designed to generate different types of profiles for visualization. To generate example profiles:

1. Change to the go_examples directory: `cd go_examples`
2. Run the generation script: `./generate_profiles.sh`
3. Upload the generated profiles in the PProfViz UI

## Development

To contribute to this project:

1. Make changes to the relevant package(s)
2. Run tests: `npm test`
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
