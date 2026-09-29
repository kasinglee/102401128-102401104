/* 详情页：列表与详情读取同一条 store 数据，联系方式默认折叠。 */
(function () {
  "use strict";

  const app = window.LostFoundApp;
  if (!app) throw new Error("js/app.js 必须先于 js/pages/detail.js 加载");

  const { store, core, registerPage, escapeHtml, iconFor, showToast } = app;

  const FINISHED_NOTE = { lost: "这条寻物信息已标记为找回。", found: "这条招领信息已标记为归还。" };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatPublishedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "未知时间";
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function pictureHtml(item) {
    const source = String(item.imageData || "");
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(source)) {
      return `<div class="detail-photo-fallback" role="img" aria-label="${escapeHtml(item.name)}暂无图片">${iconFor(item)}</div>`;
    }
    return `<figure class="detail-photo"><img src="${escapeHtml(source)}" alt="${escapeHtml(item.name)}的照片"></figure>`;
  }

  function topbarHtml() {
    return `<div class="page-topbar page-topbar-detail">
      <button class="page-back" type="button" data-back aria-label="返回上一页"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 19-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <h1>详情</h1>
      <button class="page-home" type="button" data-nav="home">首页</button>
    </div>`;
  }

  function notFoundHtml() {
    return topbarHtml() + `<section class="page-wrap"><div class="empty">
      <span class="empty-icon" aria-hidden="true">🧭</span>
      <p class="empty-title">没有找到这条信息</p>
      <p class="empty-sub">它可能已被删除，或地址不完整。可以返回列表重新选择。</p>
      <button type="button" class="button primary" data-nav="home">返回首页</button>
    </div></section>`;
  }

  function detailHtml(item) {
    const finished = core.isFinished(item);
    const typeLabel = item.type === "lost" ? "寻物" : "招领";
    return topbarHtml() + `<section class="page-wrap detail-wrap">
      <article class="detail-card${finished ? " is-finished" : ""}">
        <header class="detail-head">
          <div class="badges"><span class="badge ${item.type}">${typeLabel}</span><span class="badge status">${escapeHtml(item.status)}</span></div>
          <h2 class="detail-name">${escapeHtml(item.name)}</h2>
          <p class="detail-published">发布时间：${escapeHtml(formatPublishedAt(item.createdAt))}</p>
        </header>
        ${pictureHtml(item)}
        <dl class="detail-list">
          <div class="detail-row"><dt>物品类型</dt><dd>${typeLabel}</dd></div>
          <div class="detail-row"><dt>当前状态</dt><dd>${escapeHtml(item.status)}${finished ? `<span class="detail-finished-note">${FINISHED_NOTE[item.type]}</span>` : ""}</dd></div>
          <div class="detail-row"><dt>地点</dt><dd>${escapeHtml(item.location)}</dd></div>
          <div class="detail-row"><dt>发生日期时间</dt><dd>${escapeHtml(item.date)} ${escapeHtml(item.time)}</dd></div>
          <div class="detail-row"><dt>补充描述</dt><dd>${escapeHtml(item.description || "发布者没有填写补充描述。")}</dd></div>
        </dl>
      </article>

      <div class="contact-card">
        <button class="contact-toggle" type="button" data-contact-toggle aria-expanded="false" aria-controls="contact-panel">
          <span class="contact-toggle-label">查看联系方式</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="contact-panel" id="contact-panel" hidden>
          <p class="contact-label">QQ / 校内账号</p>
          <p class="contact-value" id="contact-value">${escapeHtml(item.contact)}</p>
          <p class="contact-warning">⚠️ 联系前请先核对物品特征。本页面不展示姓名、卡号等资料，也不提供即时聊天。</p>
          <div class="contact-actions"><button type="button" class="button secondary" data-copy-contact>复制联系方式</button></div>
        </div>
      </div>

      <p class="detail-tip">信息由发布者填写并保存在本浏览器；本程序只能区分“本浏览器发布的记录”，不验证真实身份，也不会跨设备同步。</p>
    </section>`;
  }

  function selectContactText() {
    const node = document.getElementById("contact-value");
    if (!node || !window.getSelection) return false;
    try {
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch (_) {
      return false;
    }
  }

  // 剪贴板 API 在 file:// 等环境可能不可用，此时退回 execCommand；
  // 两者都失败就选中文字让用户手动复制，绝不谎报“复制成功”。
  function legacyCopy(text) {
    let copied = false;
    try {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "readonly");
      helper.setAttribute("aria-hidden", "true");
      helper.style.position = "fixed";
      helper.style.top = "-1000px";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      if (typeof helper.setSelectionRange === "function") helper.setSelectionRange(0, helper.value.length);
      if (typeof document.execCommand === "function") copied = document.execCommand("copy");
      document.body.removeChild(helper);
    } catch (_) {
      copied = false;
    }
    if (copied) {
      showToast("联系方式已复制到剪贴板");
      return;
    }
    selectContactText();
    showToast("当前浏览器不允许自动复制，已选中联系方式，请按 Ctrl+C 复制");
  }

  function copyContact(value) {
    const text = String(value || "").trim();
    if (!text) {
      showToast("这条信息没有填写联系方式");
      return;
    }
    const clipboard = navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      clipboard.writeText(text).then(
        () => showToast("联系方式已复制到剪贴板"),
        () => legacyCopy(text)
      );
      return;
    }
    legacyCopy(text);
  }

  registerPage("detail", {
    render(ctx) {
      const item = store.getItem(ctx.params.itemId);
      return item ? detailHtml(item) : notFoundHtml();
    },
    mount(ctx) {
      const item = store.getItem(ctx.params.itemId);
      const toggle = document.querySelector("[data-contact-toggle]");
      const panel = document.getElementById("contact-panel");
      if (toggle && panel) {
        toggle.addEventListener("click", () => {
          const opening = panel.hidden;
          panel.hidden = !opening;
          toggle.setAttribute("aria-expanded", String(opening));
          toggle.classList.toggle("is-open", opening);
          const label = toggle.querySelector(".contact-toggle-label");
          if (label) label.textContent = opening ? "收起联系方式" : "查看联系方式";
        });
      }
      const copyButton = document.querySelector("[data-copy-contact]");
      if (copyButton && item) {
        copyButton.addEventListener("click", () => copyContact(item.contact));
      }
    },
  });
})();
