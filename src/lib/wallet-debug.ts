import * as Freighter from '@stellar/freighter-api';

// Simple debug function to test Freighter directly
export async function debugFreighterConnection() {
  console.log('🔍 DEBUG: Testing Freighter connection...');

  // Check window object
  console.log('📊 Window check:', {
    hasWindow: typeof window !== 'undefined',
    hasFreighterProp: typeof window !== 'undefined' && 'freighter' in window,
    windowFreighter: typeof window !== 'undefined' ? window.freighter : undefined,
  });

  // Check Freighter API
  console.log('📊 Freighter API check:', {
    freighterImport: Freighter,
    hasRequestAccess: typeof Freighter?.requestAccess === 'function',
    hasIsConnected: typeof Freighter?.isConnected === 'function',
    hasSignTransaction: typeof Freighter?.signTransaction === 'function',
  });

  try {
    // Test requestAccess directly
    console.log('🔗 Testing Freighter.requestAccess()...');
    const result = await Freighter.requestAccess();
    console.log('✅ Freighter.requestAccess() result:', result);
    return result;
  } catch (error) {
    console.error('❌ Freighter.requestAccess() error:', error);
    throw error;
  }
}
