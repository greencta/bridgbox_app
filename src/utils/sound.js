// src/utils/sound.js

/**
 * Plays a notification sound.
 * @param {string} soundFile - The path to the sound file in the public folder.
 */
export const playNotificationSound = (soundFile = '/notification.mp3') => {
  const audio = new Audio(soundFile);
  audio.play().catch(error => {
    // Autoplay was prevented. This is a common browser policy.
    // The user must interact with the page first.
    console.error("Error playing notification sound:", error);
  });
};