/* 搜索页：关键词搜索 + 类型/地点筛选。数据全部来自 LostFoundApp.store，不另建数据源。 */
(function () {
  "use strict";

  const app = window.LostFoundApp;
  if (!app) throw new Error("js/app.js 必须先于 js/pages/search.js 加载");

  const { store, registerPage, escapeHtml, cardHtml, refresh, showToast } = app;

  const QUICK_KEYWORDS = ["耳机", "雨伞", "校园卡", "玫瑰园"];

  // 搜索状态放在模块作用域：从搜索结果进入详情再返回时，关键词、筛选条件和结果都保留。
  const searchState = { query: "", type: "all", location: "", submitted: false };
  let focusQueryInput = false;
  // navigate() 每次调用都会传入一个新的 params 对象，因此用对象身份判断“是否刚进入本页”。
  let handledParams = null;

  function trim(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function resetSearchState() {
    searchState.query = "";
    searchState.type = "all";
    searchState.location = "";
    searchState.submitted = false;
    focusQueryInput = true;
  }

  function currentResults() {
    return store.list({ query: searchState.query, type: searchState.type, location: searchState.location });
  }

  function typeButton(value, label) {
    const active = searchState.type === value;
    return `<button type="button" class="filter-button${active ? " is-active" : ""}" data-search-type="${value}" aria-pressed="${active}">${label}</button>`;
  }

  function summaryHtml(count) {
    const parts = [`关键词：<strong>${escapeHtml(searchState.query)}</strong>`];
    if (searchState.type !== "all") parts.push(`类型：<strong>${searchState.type === "lost" ? "寻物" : "招领"}</strong>`);
    if (searchState.location) parts.push(`地点：<strong>${escapeHtml(searchState.location)}</strong>`);
    return `<div class="search-summary"><p class="search-summary-line">找到 <strong>${count}</strong> 条结果 · ${parts.join(" · ")}</p></div>`;
  }

  function resultHeading() {
    return `<div class="search-results-head"><h2 class="search-results-title">搜索结果</h2><button type="button" class="search-edit" data-search-edit>修改条件</button></div>`;
  }

  function resultHtml() {
    // 关键词为空时一律回到初始提示，避免出现“空白输入却列出了全部信息”。
    if (!searchState.submitted || !searchState.query) {
      return `<div class="search-start">
        <p class="search-start-title">输入关键词后点击“搜索”或按 Enter 开始查找。</p>
        <p class="search-start-sub">常用关键词</p>
        <div class="chip-row">${QUICK_KEYWORDS.map((word) => `<button type="button" class="chip" data-quick="${escapeHtml(word)}">${escapeHtml(word)}</button>`).join("")}</div>
      </div>`;
    }
    const items = currentResults();
    if (!items.length) {
      return resultHeading() + summaryHtml(0) + `<div class="empty search-empty">
        <span class="empty-icon" aria-hidden="true">🔎</span>
        <p class="empty-title">未找到与「${escapeHtml(searchState.query)}」相关的信息</p>
        <p class="empty-sub">试试更短的关键词，或去掉地点筛选后重新搜索。</p>
        <button type="button" class="button secondary" data-search-retry>修改关键词</button>
      </div>`;
    }
    return resultHeading() + summaryHtml(items.length) + `<div class="item-grid">${items.map(cardHtml).join("")}</div>`;
  }

  function pageHtml() {
    return `<div class="page-topbar search-topbar"><div class="page-topbar-inner">
      <button class="page-back" type="button" data-back aria-label="返回首页"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 19-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <h1>搜索</h1>
    </div>
    </div>
    <section class="page-wrap search-wrap" aria-labelledby="search-title">
      <div class="search-intro">
        <p class="eyebrow">FIND A CLUE</p>
        <h2 id="search-title">查找校园失物</h2>
        <p>输入线索，筛选信息，再打开卡片查看详情。</p>
      </div>
      <form class="search-card" id="search-form" role="search" novalidate>
        <div class="search-row">
          <label class="sr-only" for="search-query">搜索关键词</label>
          <input class="input search-input" id="search-query" name="query" type="search" placeholder="例如：耳机、雨伞、东3-305" value="${escapeHtml(searchState.query)}" autocomplete="off">
          <button class="button primary search-submit" type="submit">搜索</button>
        </div>
        <div class="search-filters">
          <div class="filter-bar" role="group" aria-label="按信息类型筛选">${typeButton("all", "全部")}${typeButton("lost", "寻物")}${typeButton("found", "招领")}</div>
          <div class="search-location">
            <label for="search-location">地点</label>
            <input class="input" id="search-location" name="location" type="text" maxlength="100" placeholder="可选，例如：玫瑰园" value="${escapeHtml(searchState.location)}" autocomplete="off">
          </div>
        </div>
        <p class="search-note">搜索范围包含物品名称、补充描述和地点；关键词留空时不会列出全部信息。</p>
      </form>
      <div class="search-result-area" id="search-result-area" aria-live="polite" tabindex="-1">${resultHtml()}</div>
    </section>`;
  }

  function revealResults() {
    const resultArea = document.getElementById("search-result-area");
    if (!resultArea) return;
    resultArea.focus({ preventScroll: true });
    resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function syncFromInputs(queryInput, locationInput) {
    if (queryInput) searchState.query = trim(queryInput.value);
    if (locationInput) searchState.location = trim(locationInput.value);
  }

  function applySearch(queryInput, locationInput) {
    syncFromInputs(queryInput, locationInput);
    if (!searchState.query) {
      // 空白或纯空格输入不算一次搜索，避免变成“列出全部”。
      searchState.submitted = false;
      focusQueryInput = true;
      refresh();
      showToast("请先输入关键词再搜索");
      return;
    }
    searchState.submitted = true;
    refresh();
    revealResults();
    const count = currentResults().length;
    showToast(count
      ? `找到 ${count} 条与「${searchState.query}」相关的信息`
      : `没有找到与「${searchState.query}」相关的信息`);
  }

  registerPage("search", {
    render(ctx) {
      if (ctx.params !== handledParams) {
        handledParams = ctx.params;
        if (ctx.params && ctx.params.reset) resetSearchState();
      }
      return pageHtml();
    },
    mount() {
      const form = document.getElementById("search-form");
      if (!form) return;
      const queryInput = document.getElementById("search-query");
      const locationInput = document.getElementById("search-location");

      if (focusQueryInput) {
        focusQueryInput = false;
        if (queryInput) queryInput.focus();
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        applySearch(queryInput, locationInput);
      });

      form.querySelectorAll("[data-search-type]").forEach((button) => {
        button.addEventListener("click", () => {
          syncFromInputs(queryInput, locationInput);
          // 若关键词已被清空，退回到初始提示状态，而不是列出全部信息。
          if (!searchState.query) searchState.submitted = false;
          searchState.type = button.dataset.searchType;
          refresh();
        });
      });

      document.querySelectorAll("#search-result-area [data-quick]").forEach((button) => {
        button.addEventListener("click", () => {
          const word = trim(button.dataset.quick);
          searchState.query = word;
          searchState.submitted = Boolean(word);
          refresh();
          revealResults();
          showToast(`已按关键词「${word}」搜索`);
        });
      });

      const edit = document.querySelector("[data-search-edit]");
      if (edit) {
        edit.addEventListener("click", () => {
          form.scrollIntoView({ behavior: "smooth", block: "start" });
          queryInput.focus({ preventScroll: true });
        });
      }

      const retry = document.querySelector("[data-search-retry]");
      if (retry) {
        retry.addEventListener("click", () => {
          searchState.query = "";
          searchState.submitted = false;
          focusQueryInput = true;
          refresh();
        });
      }
    },
  });
})();
