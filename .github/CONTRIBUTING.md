# Contributing to GoProf Visualizer

Thank you for your interest in contributing to GoProf Visualizer! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers understand your report, reproduce the issue, and find related reports.

Before creating bug reports, please check the issue list as you might find that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as much detail as possible.
* **Provide specific examples** to demonstrate the steps.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots or animated GIFs** which show you following the described steps and clearly demonstrate the problem.
* **If the problem is related to performance or memory**, include a CPU profile capture and a memory dump with your report.
* **If the problem wasn't triggered by a specific action**, describe what you were doing before the problem happened.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Include screenshots or animated GIFs** which help you demonstrate the steps.
* **Explain why this enhancement would be useful** to most users.
* **List some other applications where this enhancement exists**, if applicable.

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Include screenshots and animated GIFs in your pull request whenever possible
* Follow the JavaScript and Go styleguides
* Include unit tests
* Document new code
* End all files with a newline

## Development Workflow

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/goprof-visualizer.git`
3. Create a branch for your changes: `git checkout -b feature/your-feature-name`
4. Install dependencies:
   - Frontend: `cd packages/frontend && npm install`
   - Backend: `cd packages/backend && npm install`
5. Run the application:
   - Start both frontend and backend: `npm run dev` from the root directory

### Testing

We use Jest for JavaScript tests and the standard Go testing framework for Go code.

* To run all JavaScript tests: `npm test` from the root directory
* To run Go tests: `cd go_examples && go test ./...`

### Code Style

For JavaScript/TypeScript:
* We use ESLint for linting
* Run linter: `npm run lint` from the root directory

For Go:
* Follow the standard Go code style
* Use `gofmt` to format your code
* Run `golint` and `go vet` to check for issues

## Project Structure

```
.
├── packages/
│   ├── frontend/      # React frontend application
│   ├── backend/       # Node.js backend server
│   └── shared/        # Shared code between frontend and backend
├── go_examples/       # Example Go applications that generate pprof profiles
│   ├── webservice/    # Web service example
│   ├── memoryapp/     # Memory-intensive application example
│   └── concurrency/   # Concurrency patterns example
└── profiles/          # Sample profiles for testing
```

## Releasing

When a new release is ready, we will:

1. Tag a version: `git tag -a vX.Y.Z -m "Release X.Y.Z"`
2. Push the tag: `git push origin vX.Y.Z`
3. Create a release on GitHub with release notes

## Questions?

Feel free to open an issue with your question, and we'll do our best to help you.

Thank you for contributing to GoProf Visualizer!