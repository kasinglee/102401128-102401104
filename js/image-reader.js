/* Only the latest selection may update the current publishing form. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LostFoundImageReader = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function createImageReader({ makeReader, onLoad, onError, isActive = () => true }) {
    let generation = 0;
    let reader = null;
    let disposed = false;
    function cancel() {
      generation += 1;
      const previous = reader;
      reader = null;
      if (previous && previous.readyState === 1) previous.abort();
    }
    return {
      select(file) {
        cancel();
        if (!file || disposed) return;
        const current = makeReader();
        reader = current;
        const selected = generation;
        const usable = () => !disposed && selected === generation && isActive();
        current.onload = () => { if (usable()) onLoad(String(current.result || "")); };
        current.onerror = () => { if (usable()) onError(); };
        current.readAsDataURL(file);
      },
      dispose() { disposed = true; cancel(); },
    };
  }
  return { createImageReader };
});
