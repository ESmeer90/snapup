// Notification Sound - Web Audio API chime generator
// Generates a pleasant, subtle two-tone chime without any external audio files

import { supabase } from '@/lib/supabase';

let audioContext: AudioContext | null = null;
let soundPreferenceCache: boolean | null = null;
let lastSoundTime = 0;
const MIN_SOUND_INTERVAL = 2000; // Don't play sounds more than once every 2 seconds

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a subtle two-tone notification chime using Web Audio API.
 * Uses sine waves with a gentle attack/decay envelope for a pleasant sound.
 */
export function playNotificationChime(): void {
  const now = Date.now();
  if (now - lastSoundTime < MIN_SOUND_INTERVAL) return;
  lastSoundTime = now;

  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const currentTime = ctx.currentTime;

    // Create master gain for overall volume
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.15, currentTime);
    masterGain.connect(ctx.destination);

    // First tone - C6 (1046.5 Hz)
    playTone(ctx, masterGain, 1046.5, currentTime, 0.12);

    // Second tone - E6 (1318.5 Hz) - slightly delayed for a pleasant interval
    playTone(ctx, masterGain, 1318.5, currentTime + 0.08, 0.15);

    // Third subtle harmonic - G6 (1568 Hz) - very quiet for richness
    playTone(ctx, masterGain, 1568.0, currentTime + 0.12, 0.08, 0.06);

  } catch (err) {
    console.warn('[NotifSound] Failed to play chime:', err);
  }
}

function playTone(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number = 0.12
): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);

  // Gentle attack/decay envelope
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01); // Quick attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Smooth decay

  oscillator.connect(gainNode);
  gainNode.connect(destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

/**
 * Check if notification sound is enabled for a user.
 * Caches the result to avoid repeated DB calls.
 */
export async function isSoundEnabled(userId: string): Promise<boolean> {
  if (soundPreferenceCache !== null) return soundPreferenceCache;

  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('sound_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[NotifSound] Failed to check sound preference:', error.message);
      return true; // Default to enabled
    }
    // Default to true if no preference set
    const enabled = data?.sound_enabled !== false;
    soundPreferenceCache = enabled;
    return enabled;
  } catch (err) {
    console.warn('[NotifSound] Failed to check sound preference:', err);
    return true; // Default to enabled
  }
}

/**
 * Update the sound preference for a user.
 * Uses check-then-insert/update pattern for reliability.
 */
export async function setSoundEnabled(userId: string, enabled: boolean): Promise<boolean> {
  try {
    // Check if row exists
    const { data: existing, error: selectError } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('[NotifSound] Select error:', selectError);
    }

    if (existing) {
      // Update existing row
      const { error } = await supabase
        .from('notification_preferences')
        .update({ sound_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        console.error('[NotifSound] Update error:', error);
        return false;
      }
    } else {
      // Insert new row with defaults
      const { error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          sound_enabled: enabled,
          push_enabled: false,
          new_messages: true,
          order_updates: true,
          price_drops: true,
          new_offers: true,
          marketing: false,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[NotifSound] Insert error:', error);
        return false;
      }
    }

    soundPreferenceCache = enabled;
    console.log('[NotifSound] Sound preference saved:', enabled);
    return true;
  } catch (err) {
    console.error('[NotifSound] Failed to update sound preference:', err);
    return false;
  }
}

/**
 * Clear the cached sound preference (e.g., on logout).
 */
export function clearSoundPreferenceCache(): void {
  soundPreferenceCache = null;
}

/**
 * Play the notification sound only if the user has it enabled.
 */
export async function playNotificationSoundIfEnabled(userId: string): Promise<void> {
  const enabled = await isSoundEnabled(userId);
  if (enabled) {
    playNotificationChime();
  }
}
