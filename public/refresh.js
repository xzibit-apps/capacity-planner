// Force refresh script to clear cache and reload with new styles
(function() {
  // Clear cache
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
      }
    });
  }
  
  // Force reload
  window.location.reload(true);
})();
