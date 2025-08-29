import { useEffect, useRef } from 'react';

type ClaimState = 'sealed' | 'opening' | 'opened' | 'expired' | 'returned';

export const useClaimTelemetry = (envelopeId: string, state: ClaimState) => {
  const previousState = useRef<ClaimState | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only send telemetry if state has changed
    if (previousState.current === state) {
      return;
    }

    // Clear any existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the telemetry call
    debounceTimer.current = setTimeout(async () => {
      try {
        const eventType = state === 'opened' ? 'open_success' : `envelope_${state}`;
        
        await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: eventType,
            envelopeId,
            metadata: {
              previousState: previousState.current,
              currentState: state,
              timestamp: Date.now(),
            },
          }),
        });

        previousState.current = state;
      } catch (error) {
        console.error('Failed to send telemetry:', error);
      }
    }, 500); // 500ms debounce

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [envelopeId, state]);

  // Return a manual trigger function for immediate telemetry
  const sendTelemetry = async (customEvent?: string) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: customEvent || `envelope_${state}`,
          envelopeId,
          metadata: {
            state,
            timestamp: Date.now(),
          },
        }),
      });
    } catch (error) {
      console.error('Failed to send telemetry:', error);
    }
  };

  return { sendTelemetry };
};