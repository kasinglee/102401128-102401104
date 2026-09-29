/* Shared, side-effect-free rules. Works as a browser script and in Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LostFoundCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ACTIVE_STATUS = Object.freeze({ lost: "寻找中", found: "招领中" });
  const FINISHED_STATUS = Object.freeze({ lost: "已找回", found: "已归还" });
  const VALID_TYPES = ["lost", "found"];

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isFinished(item) {
    return item.status === FINISHED_STATUS.lost || item.status === FINISHED_STATUS.found;
  }

  function validateDraft(draft, now = new Date()) {
    const errors = {};
    if (!VALID_TYPES.includes(draft.type)) errors.type = "请选择寻物或招领";
    if (!text(draft.name)) errors.name = "请填写物品名称";
    if (!text(draft.location)) errors.location = "请填写地点";
    if (!text(draft.date)) errors.date = "请选择日期";
    if (!text(draft.time)) errors.time = "请选择发生时间";
    if (!text(draft.contact)) errors.contact = "请填写 QQ 或校内账号";

    if (text(draft.date) && text(draft.time)) {
      const happenedAt = new Date(`${draft.date}T${draft.time}:00`);
      if (Number.isNaN(happenedAt.getTime())) errors.date = "日期或时间无效";
      else if (happenedAt.getTime() > now.getTime()) errors.date = "发生时间不能晚于现在";
    }
    if (text(draft.name).length > 60) errors.name = "物品名称不能超过 60 字";
    if (text(draft.location).length > 100) errors.location = "地点不能超过 100 字";
    if (text(draft.description).length > 500) errors.description = "补充描述不能超过 500 字";
    if (text(draft.contact).length > 100) errors.contact = "联系方式不能超过 100 字";
    return errors;
  }

  function createItem(draft, ownerId, id, now = new Date()) {
    const errors = validateDraft(draft, now);
    if (Object.keys(errors).length) return { item: null, errors };
    if (!text(ownerId) || !text(id)) return { item: null, errors: { form: "缺少发布者或编号" } };
    return {
      item: {
        id,
        ownerId,
        type: draft.type,
        name: text(draft.name),
        location: text(draft.location),
        date: text(draft.date),
        time: text(draft.time),
        description: text(draft.description),
        contact: text(draft.contact),
        imageData: text(draft.imageData),
        status: ACTIVE_STATUS[draft.type],
        createdAt: now.toISOString(),
      },
      errors: {},
    };
  }

  function listItems(items, options = {}) {
    const query = text(options.query).toLocaleLowerCase();
    const type = VALID_TYPES.includes(options.type) ? options.type : "all";
    const location = text(options.location).toLocaleLowerCase();
    const ownerId = text(options.ownerId);
    return items
      .filter((item) => type === "all" || item.type === type)
      .filter((item) => !ownerId || item.ownerId === ownerId)
      .filter((item) => !location || text(item.location).toLocaleLowerCase().includes(location))
      .filter((item) => !query || [item.name, item.description, item.location]
        .some((value) => text(value).toLocaleLowerCase().includes(query)))
      .filter((item) => options.includeFinished !== false || !isFinished(item))
      .sort((a, b) => Number(isFinished(a)) - Number(isFinished(b)) ||
        Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  }

  function getItem(items, id) {
    return items.find((item) => item.id === id) || null;
  }

  function finishItem(items, id, ownerId) {
    const item = getItem(items, id);
    if (!item) return { items, error: "信息不存在", item: null };
    if (!text(ownerId) || item.ownerId !== ownerId) {
      return { items, error: "只能修改自己发布的信息", item: null };
    }
    if (isFinished(item)) return { items, error: "这条信息已结束", item };
    const updated = { ...item, status: FINISHED_STATUS[item.type] };
    return {
      items: items.map((entry) => entry.id === id ? updated : entry),
      error: null,
      item: updated,
    };
  }

  return { ACTIVE_STATUS, FINISHED_STATUS, validateDraft, createItem, listItems, getItem, finishItem, isFinished };
});
