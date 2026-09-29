import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type ItemType = "found" | "lost";
type ItemStatus = "招领中" | "寻找中" | "已归还" | "已找回";

interface Item {
  id: string;
  type: ItemType;
  name: string;
  location: string;
  date: string;
  time: string;
  status: ItemStatus;
  description: string;
  publishedAt: string;
  contact: string;
  imageUrl?: string;
  isDemo?: boolean;
}

type Page =
  | { name: "home" }
  | { name: "search" }
  | { name: "detail"; itemId: string; from: "home" | "search" | "my-posts" }
  | { name: "publish" }
  | { name: "publish-success"; publishedId: string }
  | { name: "my-posts" };

// ── Demo data ─────────────────────────────────────────────────────────────
const DEMO_ITEMS: Item[] = [
  {
    id: "demo-1",
    type: "found",
    name: "黑色无线耳机",
    location: "东3-305",
    date: "2026-09-23",
    time: "14:30",
    status: "招领中",
    description: "黑色耳机盒，具体特征请联系核对。",
    publishedAt: "2026-09-23 14:30",
    contact: "31415926",
    isDemo: true,
  },
  {
    id: "demo-2",
    type: "lost",
    name: "蓝色折叠雨伞",
    location: "东3-405",
    date: "2026-09-22",
    time: "18:15",
    status: "寻找中",
    description: "蓝色折叠雨伞，伞柄有白色贴纸装饰，若拾到请联系。",
    publishedAt: "2026-09-22 18:15",
    contact: "53589793",
    isDemo: true,
  },
  {
    id: "demo-3",
    type: "found",
    name: "校园卡",
    location: "玫瑰园",
    date: "2026-09-23",
    time: "09:00",
    status: "招领中",
    description: "在教学楼一楼入口处拾到一张校园卡，请核对卡片特征后联系认领。",
    publishedAt: "2026-09-23 09:05",
    contact: "2384626433",
    isDemo: true,
  },
];

// ── Color tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#F7F9FA",
  primary: "#0F766E",
  primaryLight: "#E8F7F3",
  text: "#14242A",
  textSub: "#60717A",
  border: "#E5ECEF",
  amber: "#D97706",
  amberLight: "#FEF3C7",
  white: "#FFFFFF",
  red: "#DC2626",
  redLight: "#FEE2E2",
  gray: "#F3F4F6",
  success: "#059669",
  successLight: "#D1FAE5",
};

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTimeValue(date: Date) {
  const rounded = new Date(date);
  rounded.setMinutes(Math.round(rounded.getMinutes() / 15) * 15, 0, 0);
  return `${String(rounded.getHours()).padStart(2, "0")}:${String(rounded.getMinutes()).padStart(2, "0")}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function isFinished(item: Item) {
  return item.status === "已找回" || item.status === "已归还";
}

function activeFirst(items: Item[]) {
  return [...items].sort((a, b) => Number(isFinished(a)) - Number(isFinished(b)));
}

function TypeBadge({ type }: { type: ItemType }) {
  const isFound = type === "found";
  return (
    <span
      style={{
        background: isFound ? C.primaryLight : C.amberLight,
        color: isFound ? C.primary : C.amber,
        fontSize: 13,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        border: `1px solid ${isFound ? "#b2dfd8" : "#fde68a"}`,
        letterSpacing: 0.3,
      }}
    >
      {isFound ? "招领" : "寻物"}
    </span>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const done = status === "已归还" || status === "已找回";
  return (
    <span
      style={{
        background: done ? C.gray : "#EEF3F4",
        color: done ? C.textSub : "#52636A",
        fontSize: 13,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        border: `1px solid ${C.border}`,
        textDecoration: "none",
        letterSpacing: 0.3,
      }}
    >
      {status}
    </span>
  );
}

function ItemCard({
  item,
  onClick,
  finished,
}: {
  item: Item;
  onClick: () => void;
  finished?: boolean;
}) {
  const previewUrl = item.imageUrl ?? (!item.isDemo
    ? null
    : item.name.includes("耳机")
      ? "https://images.unsplash.com/photo-1699290438461-c89f6db093be?auto=format&fit=crop&w=320&h=320&q=80"
      : item.name.includes("雨伞")
        ? "https://images.unsplash.com/photo-1604560353366-28e44ad06afe?auto=format&fit=crop&w=320&h=320&q=80"
        : item.name.includes("校园卡")
          ? "https://images.unsplash.com/photo-1564822765390-45bc8b1f80c9?auto=format&fit=crop&w=320&h=320&q=80"
          : null);

  return (
    <button
      onClick={onClick}
      style={{
        background: finished ? "#fafafa" : C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        width: "100%",
        display: "block",
        textAlign: "left",
        opacity: finished ? 0.72 : 1,
        cursor: "pointer",
        transition: "box-shadow 0.15s",
        fontFamily: "inherit",
        position: "relative",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 12px rgba(15,118,110,0.10)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.boxShadow = "none")
      }
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 112, boxSizing: "border-box" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              marginBottom: 10,
            }}
          >
            <div
              style={{ display: "flex", gap: 6, flexWrap: "wrap", minWidth: 0 }}
            >
              <TypeBadge type={item.type} />
              <StatusBadge status={item.status} />
            </div>
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: finished ? C.textSub : C.text,
              textDecoration: finished ? "line-through" : "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
          </div>
        </div>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`${item.name}预览图片`}
            style={{
              width: 104,
              height: 104,
              objectFit: "cover",
              objectPosition: "center",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.bg,
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
        ) : (
          <div
            role="img"
            aria-label={`${item.name}暂无图片预览`}
            style={{
              width: 104,
              height: 104,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.bg,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              color: C.textSub,
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" />
              <path
                d="m5 17 5-5 3 3 2-2 4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: 10 }}>暂无图片</span>
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
          marginTop: 10,
          color: C.textSub,
          fontSize: 13,
          paddingRight: 112,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="2.5"
              y="3.5"
              width="11"
              height="10"
              rx="1.5"
              stroke={C.textSub}
              strokeWidth="1.2"
            />
            <path
              d="M5 2.5v2M11 2.5v2M2.5 6h11"
              stroke={C.textSub}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          {item.date} {item.time}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            minWidth: 0,
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5c0-2.49-2.01-4.5-4.5-4.5z"
              fill={C.textSub}
            />
            <circle cx="8" cy="6" r="1.5" fill={C.white} />
          </svg>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.location}
          </span>
        </span>
      </div>
    </button>
  );
}

// ── Bottom nav───────────────────────────────
function PageLayout({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ clientY: number; scrollTop: number } | null>(null);
  const [scrollbar, setScrollbar] = useState({ visible: false, top: 8, height: 36 });

  const updateScrollbar = () => {
    const element = scrollRef.current;
    if (!element) return;
    const { clientHeight, scrollHeight, scrollTop } = element;
    const visible = scrollHeight > clientHeight + 1;
    const floatingTrackHeight = clientHeight * 0.7;
    const height = Math.min(44, Math.max(34, (clientHeight / scrollHeight) * floatingTrackHeight));
    const trackTop = (clientHeight - floatingTrackHeight) / 2;
    const trackHeight = Math.max(0, floatingTrackHeight - height);
    const progress = visible ? scrollTop / (scrollHeight - clientHeight) : 0;
    const next = { visible, top: trackTop + trackHeight * progress, height };
    setScrollbar((current) =>
      current.visible === next.visible &&
      Math.abs(current.top - next.top) < 0.5 &&
      Math.abs(current.height - next.height) < 0.5
        ? current
        : next,
    );
  };

  useEffect(() => {
    updateScrollbar();
    const observer = new ResizeObserver(updateScrollbar);
    if (scrollRef.current) observer.observe(scrollRef.current);
    const mutationObserver = new MutationObserver(updateScrollbar);
    if (scrollRef.current) {
      mutationObserver.observe(scrollRef.current, { childList: true, subtree: true });
    }
    window.addEventListener("resize", updateScrollbar);
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updateScrollbar);
    };
  }, []);

  const dragScrollbar = (clientY: number) => {
    const element = scrollRef.current;
    const drag = dragRef.current;
    if (!element || !drag) return;
    const scrollRange = element.scrollHeight - element.clientHeight;
    const floatingTrackHeight = element.clientHeight * 0.7;
    const draggableRange = floatingTrackHeight - scrollbar.height;
    const nextScrollTop =
      drag.scrollTop + ((clientY - drag.clientY) / draggableRange) * scrollRange * 0.55;
    element.scrollTop = Math.min(Math.max(nextScrollTop, 0), scrollRange);
  };

  return (
    <div
      style={{
        height: "100dvh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`.page-scroll { scrollbar-width: none; } .page-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }`}</style>
      <div
        ref={scrollRef}
        className="page-scroll"
        onScroll={updateScrollbar}
        style={{
          height: "100%",
          width: "100%",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
      {scrollbar.visible && (
        <div
          aria-label="页面滚动条"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              clientY: event.clientY,
              scrollTop: scrollRef.current?.scrollTop ?? 0,
            };
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              dragScrollbar(event.clientY);
            }
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          style={{
            position: "absolute",
            zIndex: 120,
            top: scrollbar.top,
            right: 6,
            width: 4,
            height: scrollbar.height,
            borderRadius: 999,
            background: "rgba(15, 118, 110, 0.46)",
            boxShadow: "0 1px 3px rgba(15, 118, 110, 0.18)",
            cursor: "grab",
            touchAction: "none",
          }}
        />
      )}
    </div>
  );
}

function BottomNav({
  active,
  onHome,
  onPublish,
  onMyPosts,
}: {
  active: "home" | "publish" | "my-posts";
  onHome: () => void;
  onPublish: () => void;
  onMyPosts: () => void;
}) {
  const tabs = [
    {
      key: "home" as const,
      label: "首页",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12L12 3l9 9v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z"
            fill={active ? C.primary : "none"}
            stroke={active ? C.primary : C.textSub}
            strokeWidth="1.8"
          />
          <path
            d="M9 21V12h6v9"
            stroke={active ? C.white : C.textSub}
            strokeWidth="1.8"
          />
        </svg>
      ),
      action: onHome,
    },
    {
      key: "publish" as const,
      label: "发布",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill={active ? C.primary : "none"}
            stroke={active ? C.primary : C.textSub}
            strokeWidth="1.8"
          />
          <path
            d="M12 8v8M8 12h8"
            stroke={active ? C.white : C.textSub}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
      action: onPublish,
    },
    {
      key: "my-posts" as const,
      label: "我的",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="8"
            r="3.5"
            fill={active ? C.primary : "none"}
            stroke={active ? C.primary : C.textSub}
            strokeWidth="1.8"
          />
          <path
            d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
            stroke={active ? C.primary : C.textSub}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
      action: onMyPosts,
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 390,
        background: C.white,
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        padding: "8px 0 20px",
        zIndex: 100,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={tab.action}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
            minHeight: 44,
            fontFamily: "inherit",
          }}
        >
          {tab.icon(active === tab.key)}
          <span
            style={{
              fontSize: 12,
              fontWeight: active === tab.key ? 600 : 400,
              color: active === tab.key ? C.primary : C.textSub,
            }}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Top bar ────────────────────────────────────────────────────────────────
function TopBar({
  title,
  onBack,
  rightAction,
  centerTitle = true,
}: {
  title: ReactNode;
  onBack?: () => void;
  rightAction?: ReactNode;
  centerTitle?: boolean;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        padding: "52px 16px 0",
        height: 120,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        zIndex: 50,
        gap: 8,
      }}
    >
      {onBack && (
        <button
          aria-label="返回"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px 4px 8px 0",
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            color: C.primary,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M15 19l-7-7 7-7"
              stroke={C.primary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          ...(centerTitle
            ? {
                position: "absolute" as const,
                top: 52,
                bottom: 0,
                left: 72,
                right: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center" as const,
                pointerEvents: "none" as const,
              }
            : { flex: 1, minWidth: 0 }),
          color: C.text,
        }}
      >
        {title}
      </div>
      {rightAction && <div style={{ marginLeft: "auto" }}>{rightAction}</div>}
    </div>
  );
}

// ── HOME PAGE ──────────────────────────────────────────────────────────────
function HomePage({
  allItems,
  onSearch,
  onItem,
  onPublish,
  onMyPosts,
}: {
  allItems: Item[];
  onSearch: () => void;
  onItem: (id: string) => void;
  onPublish: () => void;
  onMyPosts: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");

  const filtered = activeFirst(allItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "lost") return item.type === "lost";
    if (filter === "found") return item.type === "found";
    return true;
  }));

  const tabs: { key: typeof filter; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "lost", label: "寻物" },
    { key: "found", label: "招领" },
  ];

  return (
    <PageLayout>
      <TopBar title={<span style={{ color: C.primary }}>拾见</span>} centerTitle={false} />
      {/* Header */}
      <div
        style={{
          background: C.white,
          padding: "12px 20px 0",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: C.textSub,
            marginBottom: 14,
            lineHeight: 1.4,
          }}
        >
          让每一份失物，都有被找回的机会
        </p>

        {/* Search bar */}
        <button
          onClick={onSearch}
          style={{
            width: "100%",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            marginBottom: 14,
            minHeight: 44,
            fontFamily: "inherit",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={C.textSub} strokeWidth="2" />
            <path
              d="M20 20l-4-4"
              stroke={C.textSub}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span style={{ fontSize: 14, color: C.textSub }}>
            搜索物品名称或描述…
          </span>
        </button>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: `1px solid ${C.border}`,
            marginBottom: -1,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                background: "none",
                border: "none",
                borderBottom:
                  filter === tab.key
                    ? `2px solid ${C.primary}`
                    : "2px solid transparent",
                padding: "8px 18px",
                fontSize: 14,
                fontWeight: filter === tab.key ? 600 : 400,
                color: filter === tab.key ? C.primary : C.textSub,
                cursor: "pointer",
                minHeight: 44,
                fontFamily: "inherit",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "14px 16px",
          paddingBottom: 90,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              color: C.textSub,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14 }}>该分类暂无内容</div>
          </div>
        ) : (
          filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => onItem(item.id)}
              finished={isFinished(item)}
            />
          ))
        )}
      </div>

      <BottomNav
        active="home"
        onHome={() => {}}
        onPublish={onPublish}
        onMyPosts={onMyPosts}
      />
    </PageLayout>
  );
}

// ── SEARCH PAGE ────────────────────────────────────────────────────────────
function SearchPage({
  allItems,
  query,
  submitted,
  onQueryChange,
  onSubmittedChange,
  onBack,
  onItem,
}: {
  allItems: Item[];
  query: string;
  submitted: boolean;
  onQueryChange: (query: string) => void;
  onSubmittedChange: (submitted: boolean) => void;
  onBack: () => void;
  onItem: (id: string) => void;
}) {
  const KEYWORDS = ["耳机", "雨伞", "校园卡"];
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const results =
    submitted && normalizedQuery
      ? activeFirst(allItems.filter(
          (item) =>
            item.name.toLocaleLowerCase().includes(normalizedQuery) ||
            item.description.toLocaleLowerCase().includes(normalizedQuery) ||
            item.location.toLocaleLowerCase().includes(normalizedQuery),
        ))
      : [];

  const handleSearch = () => {
    onSubmittedChange(Boolean(normalizedQuery));
  };

  const handleKeyword = (kw: string) => {
    onQueryChange(kw);
    onSubmittedChange(true);
  };

  const handleChange = (v: string) => {
    onQueryChange(v);
    if (submitted) onSubmittedChange(false);
  };

  return (
    <PageLayout>
      <TopBar title="搜索" onBack={onBack} />
      <div
        style={{
          background: C.white,
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "0 10px",
            gap: 6,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={C.textSub} strokeWidth="2" />
            <path
              d="M20 20l-4-4"
              stroke={C.textSub}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            autoFocus={!submitted}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="输入物品名称或描述"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: C.text,
              height: 44,
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              aria-label="清空搜索"
              onClick={() => {
                onQueryChange("");
                onSubmittedChange(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                minWidth: 44,
                minHeight: 44,
                color: C.textSub,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={C.textSub}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          style={{
            background: C.primary,
            color: C.white,
            border: "none",
            borderRadius: 8,
            padding: "0 14px",
            height: 44,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
            minHeight: 44,
          }}
        >
          搜索
        </button>
      </div>

      <div style={{ flex: 1, padding: "16px", paddingBottom: 20 }}>
        {!submitted && (
          <div>
            <p
              style={{
                fontSize: 13,
                color: C.textSub,
                marginBottom: 10,
                fontWeight: 500,
              }}
            >
              常用关键词
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  onClick={() => handleKeyword(kw)}
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: "7px 16px",
                    fontSize: 14,
                    color: C.text,
                    cursor: "pointer",
                    minHeight: 44,
                    fontFamily: "inherit",
                  }}
                >
                  {kw}
                </button>
              ))}
            </div>
            <div
              style={{
                marginTop: 24,
                background: C.primaryLight,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                color: C.primary,
              }}
            >
              💡
              前端交互原型：搜索当前会话中的物品名称、描述和地点；刷新后恢复演示数据。
            </div>
          </div>
        )}

        {submitted && results.length > 0 && (
          <div>
            <p style={{ fontSize: 13, color: C.textSub, marginBottom: 12 }}>
              找到 {results.length} 条结果，关键词：
              <strong style={{ color: C.text }}>"{query}"</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {results.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClick={() => onItem(item.id)}
                  finished={isFinished(item)}
                />
              ))}
            </div>
          </div>
        )}

        {submitted && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: C.text,
                marginBottom: 6,
              }}
            >
              未找到与「{query}」相关的信息
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.textSub,
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              建议换用更短的关键词，
              <br />
              如"耳机""雨伞""校园卡"
            </div>
            <button
              onClick={() => {
                onQueryChange("");
                onSubmittedChange(false);
              }}
              style={{
                background: C.primaryLight,
                color: C.primary,
                border: `1px solid #b2dfd8`,
                borderRadius: 10,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 44,
                fontFamily: "inherit",
              }}
            >
              修改关键词
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

// ── DETAIL PAGE ────────────────────────────────────────────────────────────
function DetailPage({
  item,
  onBack,
  onHome,
}: {
  item: Item;
  onBack: () => void;
  onHome: () => void;
}) {
  const [contactVisible, setContactVisible] = useState(false);

  return (
    <PageLayout>
      <TopBar
        title="详情"
        onBack={onBack}
        rightAction={
          <button
            onClick={onHome}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: C.textSub,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontFamily: "inherit",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12L12 3l9 9v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z"
                stroke={C.textSub}
                strokeWidth="1.8"
              />
            </svg>
            首页
          </button>
        }
      />

      <div style={{ flex: 1, padding: "20px 16px", paddingBottom: 32 }}>
        {/* Main card */}
        <div
          style={{
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              background: C.primaryLight,
              padding: "16px 18px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <TypeBadge type={item.type} />
              <StatusBadge status={item.status} />
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.3,
              }}
            >
              {item.name}
            </div>
          </div>

          <div
            style={{
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <Row label="地点" value={item.location} icon="📍" />
            <Divider />
            <Row label="发生时间" value={`${item.date} ${item.time}`} icon="📅" />
            <Divider />
            <Row label="描述" value={item.description} icon="📝" multiline />
            <Divider />
            <Row label="发布时间" value={item.publishedAt} icon="🕐" />
          </div>
        </div>

        {/* Contact */}
        <div
          style={{
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        >
          {!contactVisible ? (
            <button
              onClick={() => setContactVisible(true)}
              style={{
                width: "100%",
                padding: "14px 18px",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 52,
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>
                查看联系方式
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke={C.primary}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : (
            <div style={{ padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.textSub,
                  marginBottom: 8,
                }}
              >
                联系方式
              </div>
              <div style={{ fontSize: 15, color: C.text, marginBottom: 10 }}>
                QQ / 校内账号：{item.contact}
              </div>
              <div
                style={{
                  background: C.amberLight,
                  border: `1px solid #fde68a`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "#92400e",
                  lineHeight: 1.5,
                }}
              >
                ⚠️ 请先核对物品特征，不要公开证件号码。
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function Row({
  label,
  value,
  icon,
  multiline,
}: {
  label: string;
  value: string;
  icon: string;
  multiline?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: multiline ? "flex-start" : "center",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: C.textSub, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "0 -18px" }} />;
}

// ── PUBLISH PAGE ───────────────────────────────────────────────────────────
function PublishPage({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (item: Item) => void;
}) {
  const [pubType, setPubType] = useState<ItemType>("lost");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(() => localDateValue(new Date()));
  const [time, setTime] = useState(() => localTimeValue(new Date()));
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "请填写物品名称";
    if (!location.trim()) e.location = "请填写地点";
    if (!date.trim()) e.date = "请填写日期";
    if (!time.trim()) e.time = "请填写时间";
    if (!contact.trim()) e.contact = "请填写 QQ 或校内账号";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    const newItem: Item = {
      id: `user-${Date.now()}`,
      type: pubType,
      name: name.trim(),
      location: location.trim(),
      date: date.trim(),
      time: time.trim(),
      status: pubType === "lost" ? "寻找中" : "招领中",
      description: description.trim() || "（无补充描述）",
      publishedAt: `${localDateValue(new Date())} 演示`,
      contact: contact.trim(),
      imageUrl: imageUrl ?? undefined,
    };
    onSuccess(newItem);
  };

  const inputStyle = (err?: string): CSSProperties => ({
    width: "100%",
    background: err ? C.redLight : C.bg,
    border: `1px solid ${err ? C.red : C.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 15,
    minHeight: 44,
    color: C.text,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  });

  const label = pubType === "lost" ? "发布寻物" : "发布招领";

  return (
    <PageLayout>
      <TopBar title={label} onBack={onBack} />

      {/* Type toggle */}
      <div
        style={{
          background: C.white,
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            background: C.bg,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            padding: 3,
          }}
        >
          {(["lost", "found"] as ItemType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setPubType(t);
                setErrors({});
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                background: pubType === t ? C.primary : "none",
                color: pubType === t ? C.white : C.textSub,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 44,
                transition: "background 0.15s",
                fontFamily: "inherit",
              }}
            >
              {t === "lost" ? "发布寻物" : "发布招领"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "16px",
          paddingBottom: 24,
        }}
      >
        {/* Group: 物品信息 */}
        <Section title="物品信息">
          <Field label="物品名称" required error={errors.name}>
            <input
              style={inputStyle(errors.name)}
              placeholder="如：黑色无线耳机"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
            />
          </Field>
          <Field label="地点" required error={errors.location}>
            <input
              style={inputStyle(errors.location)}
              placeholder="如：图书馆二楼自习区"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setErrors((prev) => ({ ...prev, location: "" }));
              }}
            />
          </Field>
          <Field label="日期" required error={errors.date}>
            <input
              type="date"
              style={inputStyle(errors.date)}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors((prev) => ({ ...prev, date: "" }));
              }}
            />
          </Field>
          <Field label="发生时间" required error={errors.time}>
            <input
              type="time"
              step={900}
              style={inputStyle(errors.time)}
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setErrors((prev) => ({ ...prev, time: "" }));
              }}
            />
          </Field>
          <Field label="补充描述" hint="选填">
            <textarea
              style={{ ...inputStyle(), height: 80, resize: "none" }}
              placeholder="填写物品特征、颜色、品牌等（选填）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="物品图片" hint="选填">
            <label
              style={{
                minHeight: 76,
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: `1px dashed ${C.border}`,
                borderRadius: 8,
                padding: 8,
                cursor: "pointer",
                color: C.textSub,
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="待发布物品图片预览"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 6,
                    objectFit: "cover",
                    objectPosition: "center",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 6,
                    background: C.bg,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  ＋
                </span>
              )}
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                {imageUrl ? "点击更换图片" : "上传图片"}
                <br />
                将从图片中心裁切为方形预览
              </span>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setImageUrl(URL.createObjectURL(file));
                }}
              />
            </label>
          </Field>
        </Section>

        {/* Group: 联系方式 */}
        <Section title="联系方式">
          <div
            style={{
              background: C.primaryLight,
              border: `1px solid #B2DFD8`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              color: C.primary,
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            填写演示 QQ 或校内账号即可；
            <br />
            请勿填手机号、证件号。
          </div>
          <Field label="QQ 或校内账号" required error={errors.contact}>
            <input
              style={inputStyle(errors.contact)}
              placeholder="填写演示账号"
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                setErrors((prev) => ({ ...prev, contact: "" }));
              }}
            />
          </Field>
        </Section>

        {Object.keys(errors).filter((k) => errors[k]).length > 0 && (
          <div
            style={{
              background: C.redLight,
              border: `1px solid #fca5a5`,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: C.red,
              marginBottom: 12,
            }}
          >
            ❌ 请填写所有必填项后再提交
          </div>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            background: C.primary,
            color: C.white,
            border: "none",
            borderRadius: 12,
            padding: "14px 0",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            minHeight: 50,
            fontFamily: "inherit",
            letterSpacing: 1,
          }}
        >
          {label}
        </button>
      </div>
    </PageLayout>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: C.textSub,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "4px 14px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
          {label}
        </span>
        {required && <span style={{ color: C.red, fontSize: 13 }}>*</span>}
        {hint && (
          <span style={{ fontSize: 13, color: C.textSub, marginLeft: 4 }}>
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <div style={{ fontSize: 13, color: C.red, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

// ── PUBLISH SUCCESS ────────────────────────────────────────────────────────
function PublishSuccessPage({
  item,
  onMyPosts,
  onHome,
}: {
  item: Item;
  onMyPosts: () => void;
  onHome: () => void;
}) {
  const isLost = item.type === "lost";
  return (
    <PageLayout>
      <TopBar title="发布成功" />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            background: C.primaryLight,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            marginBottom: 20,
          }}
        >
          ✅
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}
        >
          {isLost ? "寻物信息已发布" : "招领信息已发布"}
        </div>
        <div
          style={{
            fontSize: 14,
            color: C.textSub,
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          「{item.name}」{isLost ? "寻物" : "招领"}信息已成功发布
        </div>
        <div style={{ fontSize: 13, color: C.textSub, marginBottom: 32 }}>
          希望{isLost ? "早日找到失物" : "物品顺利归还原主"}！
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
            maxWidth: 300,
          }}
        >
          <button
            onClick={onMyPosts}
            style={{
              background: C.primary,
              color: C.white,
              border: "none",
              borderRadius: 12,
              padding: "14px 0",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 50,
              fontFamily: "inherit",
            }}
          >
            查看我的发布
          </button>
          <button
            onClick={onHome}
            style={{
              background: C.white,
              color: C.primary,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "14px 0",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 50,
              fontFamily: "inherit",
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

// ── MY POSTS PAGE ──────────────────────────────────────────────────────────
function MyPostsPage({
  items,
  onUpdateStatus,
  onItem,
  onHome,
  onPublish,
}: {
  items: Item[];
  onUpdateStatus: (id: string) => void;
  onItem: (id: string) => void;
  onHome: () => void;
  onPublish: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleUpdate = (item: Item) => {
    onUpdateStatus(item.id);
    const verb = item.type === "lost" ? "已找回" : "已归还";
    setFeedback(`「${item.name}」状态已更新为「${verb}」`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <PageLayout>
      <TopBar title="我的发布" />

      <div style={{ padding: "10px 16px", background: C.primaryLight, color: C.primary, fontSize: 13, lineHeight: 1.5 }}>
        当前为单人交互演示：这里只显示预设为“我的”的雨伞和本次会话新发布的信息。
      </div>

      {feedback && (
        <div
          style={{
            background: C.successLight,
            border: `1px solid #6ee7b7`,
            padding: "10px 16px",
            fontSize: 13,
            color: C.success,
            textAlign: "center",
          }}
        >
          ✓ {feedback}
        </div>
      )}

      <div
        style={{
          flex: 1,
          padding: "14px 16px",
          paddingBottom: 90,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              color: C.textSub,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>暂无发布记录</div>
            <button
              onClick={onPublish}
              style={{
                background: C.primary,
                color: C.white,
                border: "none",
                borderRadius: 10,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 44,
                fontFamily: "inherit",
              }}
            >
              去发布
            </button>
          </div>
        ) : (
          items.map((item) => {
            const done = isFinished(item);
            const actionLabel =
              item.type === "lost" ? "标记已找回" : "标记已归还";
            return (
              <div
                key={item.id}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <ItemCard
                  item={item}
                  onClick={() => onItem(item.id)}
                  finished={done}
                />
                {!done && (
                  <button
                    onClick={() => handleUpdate(item)}
                    style={{
                      width: "100%",
                      background: C.primaryLight,
                      color: C.primary,
                      border: "1px solid #B2DFD8",
                      borderRadius: 10,
                      padding: "10px 0",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      minHeight: 44,
                      fontFamily: "inherit",
                    }}
                  >
                    {actionLabel}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav
        active="my-posts"
        onHome={onHome}
        onPublish={onPublish}
        onMyPosts={() => {}}
      />
    </PageLayout>
  );
}

// ── ROOT APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>({ name: "home" });
  const [allItems, setAllItems] = useState<Item[]>(DEMO_ITEMS);
  const [myPostIds, setMyPostIds] = useState<string[]>(["demo-2"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const myPosts = allItems.filter((item) => myPostIds.includes(item.id));

  const goHome = () => setPage({ name: "home" });
  const goSearch = () => {
    setSearchQuery("");
    setSearchSubmitted(false);
    setPage({ name: "search" });
  };
  const goPublish = () => setPage({ name: "publish" });
  const goMyPosts = () => setPage({ name: "my-posts" });

  const goDetail = (id: string) =>
    setPage({
      name: "detail",
      itemId: id,
      from:
        page.name === "search"
          ? "search"
          : page.name === "my-posts"
            ? "my-posts"
            : "home",
    });

  const handlePublishSuccess = (item: Item) => {
    setAllItems((prev) => [item, ...prev]);
    setMyPostIds((prev) => [item.id, ...prev]);
    setPage({ name: "publish-success", publishedId: item.id });
  };

  const handleUpdateStatus = (id: string) => {
    const update = (item: Item): Item => {
      if (item.id !== id) return item;
      const newStatus: ItemStatus = item.type === "lost" ? "已找回" : "已归还";
      return { ...item, status: newStatus };
    };
    setAllItems((prev) => prev.map(update));
  };

  const getItem = (id: string) => allItems.find((item) => item.id === id);

  const shell = (children: ReactNode) => (
    <div
      style={{
        maxWidth: 390,
        minHeight: "100dvh",
        margin: "0 auto",
        position: "relative",
        background: C.bg,
        boxShadow: "0 0 40px rgba(0,0,0,0.08)",
      }}
    >
      {children}
    </div>
  );

  if (page.name === "home") {
    return shell(
      <HomePage
        allItems={allItems}
        onSearch={goSearch}
        onItem={goDetail}
        onPublish={goPublish}
        onMyPosts={goMyPosts}
      />,
    );
  }

  if (page.name === "search") {
    return shell(
      <SearchPage
        allItems={allItems}
        query={searchQuery}
        submitted={searchSubmitted}
        onQueryChange={setSearchQuery}
        onSubmittedChange={setSearchSubmitted}
        onBack={goHome}
        onItem={goDetail}
      />,
    );
  }

  if (page.name === "detail") {
    const item = getItem(page.itemId);
    if (!item) return shell(<div style={{ padding: 24 }}>找不到该物品</div>);
    const fromPage = page.from;
    return shell(
      <DetailPage
        item={item}
        onBack={() => {
          if (fromPage === "search") setPage({ name: "search" });
          else if (fromPage === "my-posts") setPage({ name: "my-posts" });
          else setPage({ name: "home" });
        }}
        onHome={goHome}
      />,
    );
  }

  if (page.name === "publish") {
    return shell(
      <PublishPage onBack={goHome} onSuccess={handlePublishSuccess} />,
    );
  }

  if (page.name === "publish-success") {
    const item = getItem(page.publishedId);
    if (!item) return shell(<div />);
    return shell(
      <PublishSuccessPage item={item} onMyPosts={goMyPosts} onHome={goHome} />,
    );
  }

  if (page.name === "my-posts") {
    return shell(
      <MyPostsPage
        items={myPosts}
        onUpdateStatus={handleUpdateStatus}
        onItem={goDetail}
        onHome={goHome}
        onPublish={goPublish}
      />,
    );
  }

  return shell(<div />);
}
