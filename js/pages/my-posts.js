/* “我的发布”页：只显示本浏览器发布的记录，并提供“已找到 / 已归还”状态更新。 */
(function () {
  "use strict";

  const app = window.LostFoundApp;
  if (!app) throw new Error("js/app.js 必须先于 js/pages/my-posts.js 加载");

  const { store, core, registerPage, escapeHtml, cardHtml, showToast } = app;

  function itemBlock(item) {
    const finished = core.isFinished(item);
    const actionLabel = item.type === "lost" ? "标记已找到" : "标记已归还";
    const action = finished
      ? `<p class="my-post-done"><span aria-hidden="true">✓</span> 已结束（${escapeHtml(item.status)}），不再提供重复结束按钮</p>`
      : `<div class="my-post-actions"><button type="button" class="button primary finish-button" data-finish="${escapeHtml(item.id)}">${actionLabel}</button></div>`;
    return `<div class="my-post-item">${cardHtml(item)}${action}</div>`;
  }

  function pageHtml() {
    const items = store.getMyItems();
    const activeCount = items.filter((item) => !core.isFinished(item)).length;
    const summary = items.length
      ? `<p class="my-posts-summary">共 <strong>${items.length}</strong> 条记录，其中进行中 <strong>${activeCount}</strong> 条。</p>`
      : "";
    const body = items.length
      ? `<div class="my-posts-list">${items.map(itemBlock).join("")}</div>
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
    render() {
      return pageHtml();
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
