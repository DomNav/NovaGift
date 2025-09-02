import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { SkinStudioProvider, useSkinStudio } from './SkinStudioContext';
import { PRESET_SKINS } from '@/store/skins';

describe('SkinStudioContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SkinStudioProvider>{children}</SkinStudioProvider>
  );

  it('provides initial state correctly', () => {
    const { result } = renderHook(() => useSkinStudio(), { wrapper });

    expect(result.current.selectedSkin).toBeNull();
  });

  it('updates selected skin', () => {
    const { result } = renderHook(() => useSkinStudio(), { wrapper });
    const testSkin = PRESET_SKINS[0];

    act(() => {
      result.current.setSelectedSkin(testSkin);
    });

    expect(result.current.selectedSkin).toEqual(testSkin);
  });



  it('throws error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useSkinStudio());
    }).toThrow('useSkinStudio must be used within SkinStudioProvider');
    
    consoleError.mockRestore();
  });
});