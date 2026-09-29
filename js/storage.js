/* All browser persistence stays behind createStore so later pages share one API. */
(function (root, factory) {
  const core = typeof module === "object" && module.exports ? require("./core.js") : root.LostFoundCore;
  const api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LostFoundStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  const KEY = "shijian.hw4.v1";
  const DEMO_ITEMS = Object.freeze([
    { id: "demo-earbuds", ownerId: "demo", type: "found", name: "黑色无线耳机", location: "东3-305", date: "2026-09-23", time: "14:30", description: "黑色耳机盒，具体特征请联系核对。", contact: "31415926", imageData: "", status: "招领中", createdAt: "2026-09-23T14:30:00+08:00" },
    { id: "demo-umbrella", ownerId: "demo", type: "lost", name: "蓝色折叠雨伞", location: "东3-405", date: "2026-09-22", time: "18:15", description: "伞柄有白色贴纸装饰，若拾到请联系。", contact: "53589793", imageData: "", status: "寻找中", createdAt: "2026-09-22T18:15:00+08:00" },
    { id: "demo-card", ownerId: "demo", type: "found", name: "校园卡", location: "玫瑰园", date: "2026-09-23", time: "09:00", description: "请先核对卡片特征；页面不展示姓名和卡号。", contact: "2384626433", imageData: "", status: "招领中", createdAt: "2026-09-23T09:05:00+08:00" },
  ]);

  function makeId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function createStore(storage, options = {}) {
    const key = options.key || KEY;
    const listeners = new Set();
    let persistent = Boolean(storage);
    let state;
    try {
      const saved = storage && JSON.parse(storage.getItem(key));
      state = saved && saved.version === 1 && Array.isArray(saved.items) &&
        typeof saved.clientId === "string" ? saved : null;
    } catch (_) {
      persistent = false;
    }
    if (!state) state = { version: 1, clientId: makeId(), items: DEMO_ITEMS.map((item) => ({ ...item })) };

    function persist() {
      if (!storage) return false;
      try {
        storage.setItem(key, JSON.stringify(state));
        persistent = true;
        return true;
      } catch (_) {
        persistent = false;
        return false;
      }
    }

    // Save the initial client ID as well, so later visits have the same owner.
    persist();
    function emit() { listeners.forEach((listener) => listener()); }
    function getItems() { return state.items.map((item) => ({ ...item })); }
    function list(options = {}) { return core.listItems(getItems(), options); }
    function getItem(id) { return core.getItem(getItems(), id); }
    function getMyItems() { return list({ ownerId: state.clientId }); }

    function publish(draft) {
      const result = core.createItem(draft, state.clientId, makeId());
      if (!result.item) return { ...result, saved: false };
      const previous = state;
      state = { ...state, items: [result.item, ...state.items] };
      if (!persist()) {
        state = previous;
        return { item: null, errors: { form: "浏览器无法保存信息，请检查存储空间或权限" }, saved: false };
      }
      emit();
      return { item: { ...result.item }, errors: {}, saved: true };
    }

    function finish(id) {
      const result = core.finishItem(state.items, id, state.clientId);
      if (result.error) return result;
      const previous = state;
      state = { ...state, items: result.items };
      if (!persist()) {
        state = previous;
        return { items: getItems(), item: null, error: "状态保存失败，请检查浏览器存储空间" };
      }
      emit();
      return { ...result, items: getItems() };
    }

    return {
      getClientId: () => state.clientId,
      isPersistent: () => persistent,
      getItems, getItem, getMyItems, list, publish, finish,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      reload() {
        if (!storage) return;
        try {
          const saved = JSON.parse(storage.getItem(key));
          if (saved && saved.version === 1 && Array.isArray(saved.items) && typeof saved.clientId === "string") {
            state = saved;
            emit();
          }
        } catch (_) { /* Keep the last usable state. */ }
      },
    };
  }

  return { KEY, DEMO_ITEMS, createStore };
});
