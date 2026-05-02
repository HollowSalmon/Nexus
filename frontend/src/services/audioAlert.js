/**
 * Audio Alert System - Creates warning sounds for sensor status changes
 */

// Create audio context for tone generation
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export function playWarningBeep() {
  /**
   * Play a single warning beep tone
   */
  try {
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Medium pitch warning tone
    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } catch (error) {
    console.warn("Audio alert failed:", error);
  }
}

export function playAlertSound() {
  /**
   * Play a distinctive alert sound pattern (3 beeps)
   */
  try {
    const now = audioContext.currentTime;
    const beepDuration = 0.15;
    const interval = 0.2;

    for (let i = 0; i < 3; i++) {
      const startTime = now + i * interval;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Slightly higher pitch for alert
      oscillator.frequency.value = 1000 + i * 100;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + beepDuration);

      oscillator.start(startTime);
      oscillator.stop(startTime + beepDuration);
    }
  } catch (error) {
    console.warn("Alert sound failed:", error);
  }
}

export function shouldPlayAlert(previousStatus, currentStatus) {
  /**
   * Determine if alert should be played based on status change
   */
  if (!currentStatus) return false;
  
  // Play alert when entering critical state
  if (currentStatus === "critical" && previousStatus !== "critical") {
    return true;
  }
  
  // Play beep when entering warning state
  if (currentStatus === "warning" && previousStatus === "normal") {
    return true;
  }
  
  return false;
}
