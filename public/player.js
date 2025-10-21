export function initAudioPlayer(selector) {
  const wrapper = document.querySelector(selector);
  if (!wrapper) return;
  const audio = wrapper.querySelector('audio');
  const playBtn = wrapper.querySelector('[data-action="play"]');
  const progress = wrapper.querySelector('input[type="range"]');
  const time = wrapper.querySelector('[data-el="time"]');

  const format = (seconds) => {
    if (Number.isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60).toString();
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      playBtn.innerText = 'Pause';
    } else {
      audio.pause();
      playBtn.innerText = 'Play';
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    progress.max = audio.duration || 0;
    time.textContent = `${format(0)} / ${format(audio.duration)}`;
  });

  audio.addEventListener('timeupdate', () => {
    progress.value = audio.currentTime;
    time.textContent = `${format(audio.currentTime)} / ${format(audio.duration)}`;
  });

  progress.addEventListener('input', () => {
    audio.currentTime = progress.value;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAudioPlayer('[data-audio-player]');
});
