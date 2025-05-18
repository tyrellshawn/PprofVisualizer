import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FunctionStacktrace from '../src/components/visualizations/function-stacktrace';

// Mock PprofFunction data
const mockFunction = {
  functionName: 'main.processRequest',
  flat: '8.24s',
  flatPercent: '52.3%',
  cum: '10.45s',
  cumPercent: '66.3%'
};

// Mock close handler
const mockCloseHandler = jest.fn();

describe('FunctionStacktrace Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders function name and details correctly', () => {
    render(
      <FunctionStacktrace
        functionData={mockFunction}
        onClose={mockCloseHandler}
      />
    );

    // Check if function name is displayed
    expect(screen.getByText('main.processRequest')).toBeInTheDocument();
    
    // Check if time metrics are displayed
    expect(screen.getByText('8.24s')).toBeInTheDocument();
    expect(screen.getByText('(52.3%)')).toBeInTheDocument();
    expect(screen.getByText('10.45s')).toBeInTheDocument();
    expect(screen.getByText('(66.3%)')).toBeInTheDocument();
  });

  test('calls close handler when close button is clicked', () => {
    render(
      <FunctionStacktrace
        functionData={mockFunction}
        onClose={mockCloseHandler}
      />
    );

    // Find the close button and click it
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Check if close handler was called
    expect(mockCloseHandler).toHaveBeenCalledTimes(1);
  });

  test('displays mock stacktrace data', () => {
    render(
      <FunctionStacktrace
        functionData={mockFunction}
        onClose={mockCloseHandler}
      />
    );
    
    // Check if stacktrace section heading exists
    expect(screen.getByText('Function Stacktrace')).toBeInTheDocument();
    
    // Check for self and total time sections
    expect(screen.getByText('Self Time:')).toBeInTheDocument();
    expect(screen.getByText('Total Time:')).toBeInTheDocument();
  });
});