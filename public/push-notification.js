window.KographPush = {
  async init() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;
    await navigator.serviceWorker.register('/sw.js');
    return true;
  },
  async askPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.requestPermission();
  }
};
