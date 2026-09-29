(function () {
  "use strict";

  const core = window.LostFoundCore;
  const storageApi = window.LostFoundStorage;
  const appElement = document.getElementById("app");
  const toastElement = document.getElementById("toast");
  if (!core || !storageApi || !appElement) throw new Error("页面脚本未按顺序加载");

  let browserStorage = null;
  try { browserStorage = window.localStorage; } catch (_) { /* Show save errors in the form. */ }
  const store = storageApi.createStore(browserStorage);
  const pages = new Map();
  let currentPage = "home";
  let currentParams = {};
  let currentFilter = "all";
  let currentQuery = "";
  let activeOnly = false;
  let toastTimer;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove("show"), 3300);
  }

  function dateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function timeValue(date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function iconFor(item) {
    if (/耳机/.test(item.name)) return "🎧";
    if (/伞/.test(item.name)) return "☂️";
    if (/卡/.test(item.name)) return "💳";
    if (/钥匙/.test(item.name)) return "🔑";
    if (/书|本/.test(item.name)) return "📚";
    return item.type === "lost" ? "🔎" : "📦";
  }

  function context() {
    // cardHtml 与 iconFor 由 app.js 统一提供，搜索页与“我的发布”页复用同一张卡片样式，
    // 避免各页各写一套渲染而导致首页、搜索、详情显示不一致。
    return {
      store, core, params: currentParams, escapeHtml, navigate, showToast, refresh: render,
      cardHtml: renderCard, iconFor,
    };
  }

  function registerPage(name, page) {
    if (!name || !page || typeof page.render !== "function") throw new Error("页面必须提供 render 函数");
    pages.set(name, page);
  }

  function navigate(name, params = {}) {
    if (!pages.has(name)) return false;
    if (name === "detail" && !params.from) params = { ...params, from: currentPage };
    currentPage = name;
    currentParams = params;
    render();
    window.scrollTo(0, 0);
    appElement.focus({ preventScroll: true });
    return true;
  }

  function render() {
    const page = pages.get(currentPage);
    if (!page) return;
    document.body.dataset.page = currentPage;
    const ctx = context();
    appElement.innerHTML = page.render(ctx);
    document.querySelectorAll("[data-nav]").forEach((button) => {
      const active = button.dataset.nav === currentPage;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (typeof page.mount === "function") page.mount(ctx);
  }

  function renderCard(item) {
    const typeLabel = item.type === "lost" ? "寻物" : "招领";
    const picture = item.imageData && /^data:image\/(jpeg|png|webp);base64,/.test(item.imageData)
      ? `<img src="${escapeHtml(item.imageData)}" alt="${escapeHtml(item.name)}的照片">`
      : `<span aria-hidden="true">${iconFor(item)}</span>`;
    return `<article class="item-card${core.isFinished(item) ? " is-finished" : ""}" data-item-id="${escapeHtml(item.id)}">
      <div class="item-body">
        <div class="badges"><span class="badge ${item.type}">${typeLabel}</span><span class="badge status">${escapeHtml(item.status)}</span></div>
        <h3>${escapeHtml(item.name)}</h3>
        <p class="item-description">${escapeHtml(item.description || "暂无补充描述")}</p>
        <div class="item-meta"><span>📍 ${escapeHtml(item.location)}</span><span>📅 ${escapeHtml(item.date)} ${escapeHtml(item.time)}</span></div>
      </div>
      <div class="item-thumb">${picture}</div>
      <button class="card-hitbox" type="button" data-detail="${escapeHtml(item.id)}" aria-label="查看${escapeHtml(item.name)}的详情"></button>
    </article>`;
  }

  registerPage("home", {
    render() {
      const items = store.list({ type: currentFilter, query: currentQuery, includeFinished: !activeOnly });
      const filterButton = (value, label) => `<button type="button" class="filter-button${currentFilter === value ? " is-active" : ""}" data-filter="${value}" aria-pressed="${currentFilter === value}">${label}</button>`;
      const resultNote = currentQuery
        ? `<div class="home-search-state"><span>正在显示与“<strong>${escapeHtml(currentQuery)}</strong>”相关的信息</span><button type="button" data-clear-home-search>清除搜索</button></div>`
        : "";
      const emptyMessage = currentQuery
        ? `没有找到与“${escapeHtml(currentQuery)}”相关的信息，请换个关键词试试。`
        : "该分类还没有信息，欢迎发布第一条。";
      return `<section class="container listing" aria-labelledby="listing-title">
        <form class="search-entry" id="home-search-form" role="search">
          <svg class="search-entry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <label class="sr-only" for="home-search-query">搜索物品名称、补充描述或地点</label>
          <input class="search-entry-text" id="home-search-query" name="query" type="search" value="${escapeHtml(currentQuery)}" placeholder="搜索名称、描述或地点，如：东三 雨伞" autocomplete="off" aria-describedby="home-search-help home-search-error">
          <button class="search-entry-cta" type="submit">搜索</button>
        </form>
        <p class="search-syntax" id="home-search-help">空格或逗号可组合线索；“东三”与“东3”相同。正则示例：/雨伞|耳机/</p>
        <p class="search-error" id="home-search-error" role="alert" hidden></p>
        ${resultNote}
        <div class="section-head"><div><p class="eyebrow">LATEST POSTS</p><h2 id="listing-title">校园失物信息</h2></div><span class="count">共 ${items.length} 条</span></div>
        <div class="filter-tools">
          <div class="filter-bar" role="group" aria-label="信息类型筛选">${filterButton("all", "全部")}${filterButton("lost", "寻物")}${filterButton("found", "招领")}</div>
          <label class="active-only"><input type="checkbox" data-active-only${activeOnly ? " checked" : ""}><span class="active-only-track" aria-hidden="true"></span><span>只看进行中</span></label>
        </div>
        <div class="item-grid">${items.length ? items.map(renderCard).join("") : `<div class="empty"><span class="empty-icon">🔎</span>${emptyMessage}</div>`}</div>
      </section>`;
    },
    mount() {
      const form = document.getElementById("home-search-form");
      const input = document.getElementById("home-search-query");
      if (form && input) {
        const error = document.getElementById("home-search-error");
        const clearEmptyQuery = () => {
          error.hidden = true;
          error.textContent = "";
          if (currentQuery && !input.value.trim()) {
            currentQuery = "";
            render();
            const nextInput = document.getElementById("home-search-query");
            if (nextInput) nextInput.focus();
          }
        };
        input.addEventListener("input", clearEmptyQuery);
        input.addEventListener("search", clearEmptyQuery);
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const nextQuery = String(input.value || "").trim();
          const parsed = core.parseSearchQuery(nextQuery);
          if (parsed.error) {
            error.textContent = parsed.error;
            error.hidden = false;
            input.focus();
            return;
          }
          currentQuery = nextQuery;
          render();
          showToast(currentQuery ? `已在首页筛选“${currentQuery}”` : "已显示全部信息");
        });
      }
      const clear = document.querySelector("[data-clear-home-search]");
      if (clear) {
        clear.addEventListener("click", () => {
          currentQuery = "";
          render();
          const nextInput = document.getElementById("home-search-query");
          if (nextInput) nextInput.focus();
        });
      }
      const activeToggle = document.querySelector("[data-active-only]");
      if (activeToggle) {
        activeToggle.addEventListener("change", () => {
          activeOnly = activeToggle.checked;
          render();
          showToast(activeOnly ? "已隐藏已结束的信息" : "已显示全部状态的信息");
        });
      }
    },
  });

  registerPage("publish", {
    render() {
      const now = new Date();
      const today = dateValue(now);
      const field = (id, label, input, full = false, help = "") => `<div class="field${full ? " full" : ""}"><label for="${id}">${label}</label>${input}<p class="field-error" id="${id}-error" aria-live="polite"></p>${help ? `<p class="field-help">${help}</p>` : ""}</div>`;
      return `<div class="publish-wrap"><div class="page-intro"><p class="eyebrow">CREATE A POST</p><h1>发布失物信息</h1></div>
        <form class="form-card" id="publish-form" novalidate>
          <section class="form-section"><h2>01 · 信息类型</h2><div class="type-switch" role="group" aria-label="选择信息类型">
            <button type="button" class="type-choice is-active" data-type="lost" aria-pressed="true">🔎 我在寻物</button>
            <button type="button" class="type-choice" data-type="found" aria-pressed="false">📦 我来招领</button>
          </div><input type="hidden" name="type" value="lost">
          <div class="claim-check-note" id="claim-check-note" role="note" hidden><strong>认领核对提示</strong><span>公开信息只写物品的大致特征，请保留一项独特细节。有人联系时，让对方先描述该细节，再商定归还方式。</span></div>
          <div class="field-grid">
            ${field("name", `物品名称 <span class="required">*</span>`, `<input class="input" id="name" name="name" maxlength="60" placeholder="例如：黑色无线耳机" autocomplete="off">`, true)}
            ${field("location", `地点 <span class="required">*</span>`, `<input class="input" id="location" name="location" maxlength="100" placeholder="例如：图书馆二楼自习区" autocomplete="off">`, true)}
            ${field("date", `发生日期 <span class="required">*</span>`, `<input class="input" id="date" name="date" type="date" value="${today}" max="${today}">`)}
            ${field("time", `发生时间 <span class="required">*</span>`, `<input class="input" id="time" name="time" type="time" value="${timeValue(now)}">`)}
            ${field("description", "补充描述", `<textarea class="input" id="description" name="description" maxlength="500" placeholder="颜色、品牌、特征等，可选填"></textarea>`, true)}
            ${field("image", "物品图片（选填）", `<div class="photo-row"><div class="photo-preview" id="photo-preview" aria-label="图片预览">＋</div><input class="file-input" id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp"></div>`, true, "支持 JPG、PNG、WebP，单张不超过 700 KB；图片只保存在本浏览器。")}
          </div></section>
          <section class="form-section"><h2>02 · 联系方式</h2><div class="privacy-note">建议填写演示 QQ 或校内账号。请勿在公开信息中填写手机号、证件号码等敏感资料；联系前先核对物品特征。</div>
          ${field("contact", `QQ 或校内账号 <span class="required">*</span>`, `<input class="input" id="contact" name="contact" maxlength="100" placeholder="例如：演示 QQ 账号" autocomplete="off">`, true)}
          </section>
          <div class="form-error" id="form-error" role="alert"></div>
          <div class="form-actions"><button type="button" class="button secondary" data-nav="home">取消</button><button type="submit" class="button primary">确认发布 <span aria-hidden="true">→</span></button></div>
        </form>
      </div>`;
    },
    mount() {
      const form = document.getElementById("publish-form");
      const imageInput = form.elements.image;
      let imageData = "";

      form.querySelectorAll("[data-type]").forEach((button) => button.addEventListener("click", () => {
        form.elements.type.value = button.dataset.type;
        const claimNote = document.getElementById("claim-check-note");
        if (claimNote) claimNote.hidden = button.dataset.type !== "found";
        form.querySelectorAll("[data-type]").forEach((choice) => {
          const active = choice === button;
          choice.classList.toggle("is-active", active);
          choice.setAttribute("aria-pressed", String(active));
        });
      }));

      function setError(name, message) {
        const field = form.elements[name];
        const label = document.getElementById(`${name}-error`);
        if (field && field.setAttribute) field.setAttribute("aria-invalid", message ? "true" : "false");
        if (label) label.textContent = message || "";
      }

      form.addEventListener("input", (event) => {
        if (event.target.name) setError(event.target.name, "");
        document.getElementById("form-error").classList.remove("is-visible");
      });

      imageInput.addEventListener("change", () => {
        const file = imageInput.files && imageInput.files[0];
        imageData = "";
        document.getElementById("photo-preview").textContent = "＋";
        if (!file) return;
        if (!/image\/(jpeg|png|webp)/.test(file.type) || file.size > 700 * 1024) {
          setError("image", "请选择 700 KB 以内的 JPG、PNG 或 WebP 图片");
          imageInput.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          imageData = String(reader.result || "");
          const preview = document.getElementById("photo-preview");
          if (preview) {
            const image = document.createElement("img");
            image.src = imageData;
            image.alt = "待发布图片预览";
            preview.replaceChildren(image);
          }
        };
        reader.onerror = () => setError("image", "图片读取失败，请重新选择");
        reader.readAsDataURL(file);
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const draft = {
          type: form.elements.type.value,
          name: form.elements.name.value,
          location: form.elements.location.value,
          date: form.elements.date.value,
          time: form.elements.time.value,
          description: form.elements.description.value,
          contact: form.elements.contact.value,
          imageData,
        };
        const errors = core.validateDraft(draft);
        if (imageInput.files.length && !imageData && !errors.image) errors.image = "请等待图片读取完成后再发布";
        for (const name of ["name", "location", "date", "time", "description", "contact", "image"]) setError(name, errors[name]);
        const formError = document.getElementById("form-error");
        if (Object.keys(errors).length) {
          formError.textContent = "请检查标红的内容后再发布。";
          formError.classList.add("is-visible");
          const first = form.elements[Object.keys(errors)[0]];
          if (first && first.focus) first.focus();
          return;
        }
        const result = store.publish(draft);
        if (!result.item) {
          formError.textContent = result.errors.form || "发布失败，请检查填写内容";
          formError.classList.add("is-visible");
          return;
        }
        const matchCount = core.findSimilarItems(result.item, store.getItems()).length;
        navigate("my-posts", { newItemId: result.item.id });
        showToast(matchCount
          ? `发布成功，自动发现 ${matchCount} 条可能相关的线索`
          : `「${result.item.name}」发布成功，暂未发现相似线索`);
      });
    },
  });

  // Second-stage teammates can replace either page with registerPage(name, page).
  registerPage("my-posts", {
    render() {
      return `<div class="page-topbar"><h1>我的发布</h1></div><section class="blank-page" aria-label="我的发布内容"></section>`;
    },
  });

  registerPage("detail", {
    render() {
      return `<div class="page-topbar page-topbar-detail">
        <button class="page-back" type="button" data-back aria-label="返回"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 19-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <h1>详情</h1>
        <button class="page-home" type="button" data-nav="home">首页</button>
      </div><section class="blank-page" aria-label="详情内容"></section>`;
    },
  });

  document.addEventListener("click", (event) => {
    const back = event.target.closest("[data-back]");
    if (back) {
      navigate(currentParams.from && currentParams.from !== "detail" ? currentParams.from : "home");
      return;
    }
    const detail = event.target.closest("[data-detail]");
    if (detail) {
      navigate("detail", { itemId: detail.dataset.detail });
      return;
    }
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      // data-entry="new" 表示从首页重新进入搜索页，可以让搜索页丢弃上一次的搜索状态；
      // navigate() 每次都会生成新的 params 对象，重复渲染不会误触发重置。
      navigate(nav.dataset.nav, nav.dataset.entry === "new" ? { reset: true } : {});
      return;
    }
    const filter = event.target.closest("[data-filter]");
    if (filter) {
      currentFilter = filter.dataset.filter;
      render();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageApi.KEY) store.reload();
  });
  store.subscribe(render);
  window.LostFoundApp = {
    store, core, registerPage, navigate, refresh: render, showToast, escapeHtml,
    cardHtml: renderCard, iconFor,
  };
  render();
})();
