/* Shared, side-effect-free rules. Works as a browser script and in Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LostFoundCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ACTIVE_STATUS = Object.freeze({ lost: "寻找中", found: "招领中" });
  const FINISHED_STATUS = Object.freeze({ lost: "已找到", found: "已归还" });
  const VALID_TYPES = ["lost", "found"];

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isFinished(item) {
    return item.status === FINISHED_STATUS.lost || item.status === FINISHED_STATUS.found ||
      (item.type === "lost" && item.status === "已找回");
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

  const CHINESE_DIGITS = Object.freeze({ 零: "0", 〇: "0", 一: "1", 二: "2", 两: "2", 三: "3", 四: "4", 五: "5", 六: "6", 七: "7", 八: "8", 九: "9" });

  function normalizeSearchText(value) {
    return text(value).normalize("NFKC").toLocaleLowerCase()
      .replace(/[零〇一二两三四五六七八九十]+/g, (number) => {
        if (!number.includes("十")) return [...number].map((digit) => CHINESE_DIGITS[digit]).join("");
        const parts = number.split("十");
        if (parts.length !== 2 || parts[0].length > 1 || parts[1].length > 1) return number;
        const tens = parts[0] ? Number(CHINESE_DIGITS[parts[0]]) : 1;
        const ones = parts[1] ? Number(CHINESE_DIGITS[parts[1]]) : 0;
        return String(tens * 10 + ones);
      });
  }

  function parseSearchQuery(value) {
    const query = text(value);
    if (!query) return { terms: [], regex: null, error: null };
    if (query.startsWith("/")) {
      const end = query.lastIndexOf("/");
      if (end < 2) return { terms: [], regex: null, error: "正则请写成 /表达式/ 或 /表达式/i" };
      const pattern = query.slice(1, end);
      const flags = query.slice(end + 1);
      if (pattern.length > 80 || !/^[imsu]*$/.test(flags)) {
        return { terms: [], regex: null, error: "正则最多 80 个字符，仅支持 i、m、s、u 标志" };
      }
      try {
        return { terms: [], regex: new RegExp(pattern, flags), error: null };
      } catch (_) {
        return { terms: [], regex: null, error: "正则表达式无效，请检查括号、转义或标志" };
      }
    }
    return {
      terms: query.split(/[\s,，、]+/u).filter(Boolean).map(normalizeSearchText),
      regex: null,
      error: null,
    };
  }

  function listItems(items, options = {}) {
    const search = parseSearchQuery(options.query);
    const type = VALID_TYPES.includes(options.type) ? options.type : "all";
    const location = text(options.location).toLocaleLowerCase();
    const ownerId = text(options.ownerId);
    return items
      .filter((item) => type === "all" || item.type === type)
      .filter((item) => !ownerId || item.ownerId === ownerId)
      .filter((item) => !location || text(item.location).toLocaleLowerCase().includes(location))
      .filter((item) => {
        if (search.error) return false;
        const fields = [item.name, item.description, item.location];
        if (search.regex) return fields.some((value) => search.regex.test(text(value)));
        const normalized = fields.map(normalizeSearchText);
        return search.terms.every((term) => normalized.some((value) => value.includes(term)));
      })
      .filter((item) => options.includeFinished !== false || !isFinished(item))
      .sort((a, b) => Number(isFinished(a)) - Number(isFinished(b)) ||
        Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  }

  function nameFragments(value) {
    const normalized = normalizeSearchText(value).replace(/[^\p{L}\p{N}]+/gu, "");
    if (!normalized) return [];
    if (/^[a-z0-9]+$/i.test(normalized)) {
      return normalized.split(/\s+/).filter((part) => part.length >= 2);
    }
    const fragments = new Set();
    for (let size = 2; size <= Math.min(4, normalized.length); size += 1) {
      for (let index = 0; index <= normalized.length - size; index += 1) {
        fragments.add(normalized.slice(index, index + size));
      }
    }
    return [...fragments];
  }

  function similarityReasons(source, candidate) {
    if (!source || !candidate || source.id === candidate.id || source.type === candidate.type ||
        isFinished(source) || isFinished(candidate)) return [];
    const reasons = [];
    const sourceLocation = normalizeSearchText(source.location).replace(/\s+/g, "");
    const candidateLocation = normalizeSearchText(candidate.location).replace(/\s+/g, "");
    if (sourceLocation && sourceLocation === candidateLocation) reasons.push(`地点相同：${text(source.location)}`);
    const candidateName = normalizeSearchText(candidate.name).replace(/[^\p{L}\p{N}]+/gu, "");
    const shared = nameFragments(source.name)
      .filter((fragment) => candidateName.includes(fragment))
      .sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
    if (shared) reasons.push(`名称共同关键词：${shared}`);
    return reasons;
  }

  function findSimilarItems(source, items, limit = 3) {
    return items
      .map((item) => ({ item, reasons: similarityReasons(source, item) }))
      .filter((entry) => entry.reasons.length)
      .sort((a, b) => b.reasons.length - a.reasons.length ||
        Date.parse(b.item.createdAt || 0) - Date.parse(a.item.createdAt || 0))
      .slice(0, Math.max(0, limit));
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

  return { ACTIVE_STATUS, FINISHED_STATUS, validateDraft, createItem, parseSearchQuery, listItems, findSimilarItems, getItem, finishItem, isFinished };
});
