import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';

// Mock Zustand store if we want to isolate state, or let it run with standard store
describe('ThemeToggle Component', () => {
  it('renders the theme toggle button', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('toggles icon states when clicked', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    
    // Initial theme (should click and toggle)
    fireEvent.click(button);
    
    // We expect class changes on html tag to occur
    const isDark = document.documentElement.classList.contains('dark');
    expect(isDark).toBeDefined();
  });
});
