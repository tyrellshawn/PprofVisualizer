# Contributing to PProfViz

Thank you for your interest in contributing to PProfViz! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in the Issues section
- Use the bug report template to create a new issue
- Include detailed steps to reproduce the bug
- Include screenshots if applicable
- Mention your environment (OS, Go version, browser, etc.)

### Suggesting Features

- Check if the feature has already been suggested in the Issues section
- Use the feature request template to create a new issue
- Explain the feature and its benefits clearly
- Consider how it fits with the existing design

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature` or `fix/your-fix`
3. Make your changes
4. Run tests and linting checks
5. Commit your changes with clear commit messages
6. Push to your branch
7. Submit a pull request to the `main` branch

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pprofviz.git
   cd pprofviz
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Project Structure

- `/packages/frontend`: React-based visualization UI
- `/packages/backend`: Express server for profile handling
- `/packages/shared`: Shared types and utilities
- `/go_examples`: Example Go programs for profile generation

## Coding Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Keep pull requests focused - one feature/fix per PR

## License

By contributing to PProfViz, you agree that your contributions will be licensed under the project's MIT License.