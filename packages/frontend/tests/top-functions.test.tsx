import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TopFunctions from '../src/components/visualizations/top-functions';

// Mock the FunctionStacktrace component
jest.mock('../src/components/visualizations/function-stacktrace', () => {
  return jest.fn(({ onClose }) => (
    <div data-testid="mock-stacktrace">
      <button onClick={onClose}>Close Mock</button>
    </div>
  ));
});

// Mock profile data
const mockProfile = {
  id: 1,
  filename: 'sample_cpu_profile.pprof',
  originalFilename: 'cpu.pprof',
  profileType: 'cpu',
  size: 1024,
  description: 'Sample CPU profile',
  metadata: {
    topFunctions: [
      {
        functionName: 'main.processRequest',
        flat: '8.24s',
        flatPercent: '52.3%',
        cum: '10.45s',
        cumPercent: '66.3%'
      },
      {
        functionName: 'encoding/json.Marshal',
        flat: '2.31s',
        flatPercent: '14.7%',
        cum: '3.56s',
        cumPercent: '22.6%'
      }
    ]
  },
  uploadedAt: '2023-05-15T10:00:00Z',
  isSaved: true,
  data: 'base64data'
};

describe('TopFunctions Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders detailed table view with function data', () => {
    render(<TopFunctions profile={mockProfile} detailed={true} />);
    
    // Check if column headers are rendered
    expect(screen.getByText('Function Name')).toBeInTheDocument();
    expect(screen.getByText('CPU Time')).toBeInTheDocument();
    expect(screen.getByText('% of Total')).toBeInTheDocument();
    
    // Check if function data is rendered
    expect(screen.getByText('main.processRequest')).toBeInTheDocument();
    expect(screen.getByText('encoding/json.Marshal')).toBeInTheDocument();
    expect(screen.getByText('8.24s')).toBeInTheDocument();
    expect(screen.getByText('52.3%')).toBeInTheDocument();
  });

  test('toggles accordion when row is clicked', () => {
    render(<TopFunctions profile={mockProfile} detailed={true} />);
    
    // Find the first row and click it to toggle accordion
    const firstRow = screen.getByText('main.processRequest').closest('tr');
    fireEvent.click(firstRow);
    
    // Check if accordion content is shown after clicking
    expect(screen.getByText('Function Details')).toBeInTheDocument();
    
    // Click again to toggle off
    fireEvent.click(firstRow);
    
    // After toggle off, the details should no longer be visible
    expect(screen.queryByText('Function Details')).not.toBeInTheDocument();
  });

  test('opens stacktrace modal when View Full Details button is clicked', () => {
    render(<TopFunctions profile={mockProfile} detailed={true} />);
    
    // Toggle accordion to show details
    const firstRow = screen.getByText('main.processRequest').closest('tr');
    fireEvent.click(firstRow);
    
    // Find and click View Full Details button
    const detailsButton = screen.getByText('View Full Details');
    fireEvent.click(detailsButton);
    
    // Check if stacktrace modal is shown
    expect(screen.getByTestId('mock-stacktrace')).toBeInTheDocument();
    
    // Close the modal
    fireEvent.click(screen.getByText('Close Mock'));
    
    // Stacktrace should be closed
    expect(screen.queryByTestId('mock-stacktrace')).not.toBeInTheDocument();
  });

  test('renders simplified view when detailed is false', () => {
    render(<TopFunctions profile={mockProfile} detailed={false} />);
    
    // Check if simplified view elements exist
    expect(screen.getByText('main.processRequest')).toBeInTheDocument();
    expect(screen.getByText('encoding/json.Marshal')).toBeInTheDocument();
    expect(screen.getByText('8.24s')).toBeInTheDocument();
    expect(screen.getByText('2.31s')).toBeInTheDocument();
  });

  test('handles empty topFunctions array', () => {
    const emptyProfile = {
      ...mockProfile,
      metadata: { topFunctions: [] }
    };
    
    render(<TopFunctions profile={emptyProfile} detailed={true} />);
    
    // Check if empty state message is shown
    expect(screen.getByText('No function data available')).toBeInTheDocument();
  });

  test('applies limit to displayed functions', () => {
    // Create a profile with many functions
    const profileWithManyFunctions = {
      ...mockProfile,
      metadata: {
        topFunctions: [
          ...mockProfile.metadata.topFunctions,
          {
            functionName: 'net/http.(*conn).serve',
            flat: '1.12s',
            flatPercent: '7.1%',
            cum: '2.98s',
            cumPercent: '18.9%'
          },
          {
            functionName: 'runtime.mallocgc',
            flat: '0.98s',
            flatPercent: '6.2%',
            cum: '1.45s',
            cumPercent: '9.2%'
          }
        ]
      }
    };
    
    // Render with limit = 2
    render(<TopFunctions profile={profileWithManyFunctions} detailed={true} limit={2} />);
    
    // Only the first two functions should be rendered
    expect(screen.getByText('main.processRequest')).toBeInTheDocument();
    expect(screen.getByText('encoding/json.Marshal')).toBeInTheDocument();
    
    // The third function should not be rendered
    expect(screen.queryByText('net/http.(*conn).serve')).not.toBeInTheDocument();
  });
});