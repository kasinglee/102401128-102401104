/* “我的发布”页：只显示本浏览器发布的记录，并提供“已找到 / 已归还”状态更新。 */
(function () {
  "use strict";

  const app = window.LostFoundApp;
  if (!app) throw new Error("js/app.js 必须先于 js/pages/my-posts.js 加载");

  const { store, core, registerPage, escapeHtml, cardHtml, showToast } = app;

  function matchHtml(item, allItems) {
    const matches = core.findSimilarItems(item, allItems);
    if (!matches.length || core.isFinished(item)) return "";
    return `<aside class="similar-clues" aria-label="${escapeHtml(item.name)}的相似线索">
      <div class="similar-clues-head"><span aria-hidden="true">✨</span><div><strong>发现 ${matches.length} 条可能相关的线索</strong><p>系统按相反类型、地点或名称关键词自动匹配，请打开详情后自行核对。</p></div></div>
      <div class="similar-clues-list">${matches.map(({ item: candidate, reasons }) => `<button type="button" class="similar-clue" data-detail="${escapeHtml(candidate.id)}">
        <span class="similar-clue-main"><b>${escapeHtml(candidate.name)}</b><small>${escapeHtml(candidate.type === "lost" ? "寻物" : "招领")} · ${escapeHtml(candidate.location)}</small></span>
        <span class="similar-clue-reason">${escapeHtml(reasons.join("；"))}</span><span aria-hidden="true">›</span>
      </button>`).join("")}</div>
    </aside>`;
  }

  function itemBlock(item, allItems, newItemId) {
    const finished = core.isFinished(item);
    const actionLabel = item.type === "lost" ? "标记已找到" : "标记已归还";
    const action = finished
      ? `<p class="my-post-done"><span aria-hidden="true">✓</span> 已结束（${escapeHtml(item.status)}），不再提供重复结束按钮</p>`
      : `<div class="my-post-actions"><button type="button" class="button primary finish-button" data-finish="${escapeHtml(item.id)}">${actionLabel}</button></div>`;
    return `<div class="my-post-item${item.id === newItemId ? " is-new-post" : ""}">${cardHtml(item)}${matchHtml(item, allItems)}${action}</div>`;
  }

  function pageHtml(newItemId) {
    const items = store.getMyItems();
    const allItems = store.getItems();
    const activeCount = items.filter((item) => !core.isFinished(item)).length;
    const summary = items.length
      ? `<p class="my-posts-summary">共 <strong>${items.length}</strong> 条记录，其中进行中 <strong>${activeCount}</strong> 条。</p>`
      : "";
    const body = items.length
      ? `<div class="my-posts-list">${items.map((item) => itemBlock(item, allItems, newItemId)).join("")}</div>
        <div class="my-posts-foot"><button type="button" class="button secondary" data-nav="publish">再发布一条</button></div>`
      : `<div class="empty">
          <span class="empty-icon" aria-hidden="true">📭</span>
          <p class="empty-title">你还没有发布过信息</p>
          <p class="empty-sub">发布寻物或招领信息后，可以在这里把记录标记为“已找到”或“已归还”。</p>
          <button type="button" class="button primary" data-nav="publish">去发布</button>
        </div>`;
    return `<section class="page-wrap my-posts-wrap" aria-labelledby="my-posts-title">
        <div class="page-intro my-posts-intro">
          <p class="eyebrow">MY POSTS</p>
          <h1 id="my-posts-title">我的发布</h1>
          <p>管理你在当前浏览器发布的信息和处理状态。</p>
        </div>
        <p class="my-posts-note">这里只显示<b>本浏览器</b>发布的记录：预设演示信息的发布者是 demo，不会出现在这里；换电脑、换浏览器或清除浏览器数据后也不会同步。</p>
        ${summary}
        ${body}
      </section>`;
  }

  registerPage("my-posts", {
    render(ctx) {
      return pageHtml(ctx.params && ctx.params.newItemId);
    },
    mount() {
      document.querySelectorAll("[data-finish]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.finish;
          const before = store.getItem(id);
          const name = before ? before.name : "这条信息";
          const result = store.finish(id);
          if (result.error) {
            showToast(result.error);
            return;
          }
          const status = result.item && result.item.status ? result.item.status : "";
          showToast(`「${name}」状态已更新为「${status}」，首页列表会同步显示`);
        });
      });
    },
  });
})();
