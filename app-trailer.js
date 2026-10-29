// The MP4 is requested only after the visitor opens the trailer.
const trigger = document.getElementById('app-trailer-trigger');
const dialog = document.getElementById('app-trailer-dialog');
const video = document.getElementById('app-trailer-video');
const errorMessage = document.getElementById('app-trailer-error');

if (trigger && dialog && video && typeof dialog.showModal === 'function') {
  const closeButton = dialog.querySelector('.app-trailer-close');
  let previousOverflow = '';
  let pointerStartedOutside = false;

  trigger.addEventListener('click', (event) => {
    // Preserve normal link behavior for open-in-new-tab gestures.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (dialog.open) return;
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    errorMessage.hidden = true;
    video.src = trigger.href;
    // A user click initiates playback; native controls remain if autoplay is denied.
    video.play().catch(() => {});
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    document.body.style.overflow = previousOverflow;
    pointerStartedOutside = false;
    trigger.focus({ preventScroll: true });
  });

  const isOutside = (event) => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', (event) => {
    pointerStartedOutside = event.target === dialog && isOutside(event);
  });
  dialog.addEventListener('click', (event) => {
    if (pointerStartedOutside && event.target === dialog && isOutside(event)) dialog.close();
    pointerStartedOutside = false;
  });
  video.addEventListener('error', () => {
    if (dialog.open && video.hasAttribute('src')) errorMessage.hidden = false;
  });
}
