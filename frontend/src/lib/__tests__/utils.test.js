import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('joins simple class name strings', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('drops falsy values from conditional classes', () => {
    const isHidden = false;
    const count = 0;
    expect(cn('base', isHidden && 'hidden', null, undefined, count && 'zero')).toBe('base');
  });

  it('applies a class only when its condition is truthy', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('merges conflicting Tailwind utilities, keeping the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('does not merge non-conflicting utilities', () => {
    expect(cn('p-2', 'text-sm')).toBe('p-2 text-sm');
  });

  it('flattens array inputs', () => {
    expect(cn(['flex', 'gap-2'], 'items-center')).toBe('flex gap-2 items-center');
  });

  it('lets a later explicit class win over an earlier conflicting one, including via className prop pattern', () => {
    const base = 'p-2 text-red-500';
    const override = 'text-blue-500';
    expect(cn(base, override)).toBe('p-2 text-blue-500');
  });
});
