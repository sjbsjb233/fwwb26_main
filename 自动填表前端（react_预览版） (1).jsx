import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  Wand2,
  ListChecks,
  HelpCircle,
  BookOpen,
  Settings,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Copy,
  ExternalLink,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * 自动填表 Web 前端页面（单文件预览版）
 * - 参考 Acctual 风格：左侧固定导航 + 右侧居中内容 + 卡片步骤引导 + 大量留白
 * - 默认关闭 Mock；可在「设置」中开启 Mock 或配置真实后端
 */

// -----------------------------
// LocalStorage helpers
// -----------------------------
const LS = {
  apiKey: "autofill_api_key_v1",
  baseUrl: "autofill_base_url_v1",
  useMock: "autofill_use_mock_v1",
  jobs: "autofill_jobs_v1",
};

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function loadJobs() {
  const raw = localStorage.getItem(LS.jobs);
  const arr = safeJsonParse(raw, []);
  return Array.isArray(arr) ? arr : [];
}

function saveJobs(jobs) {
  localStorage.setItem(LS.jobs, JSON.stringify(jobs));
}

function upsertJob(job, jobs) {
  const idx = jobs.findIndex((j) => j.job_id === job.job_id);
  if (idx >= 0) {
    const next = [...jobs];
    next[idx] = { ...next[idx], ...job, updated_at: Date.now() };
    return next;
  }
  return [{ ...job, updated_at: Date.now() }, ...jobs];
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= breakpoint : true));
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isDesktop;
}

// -----------------------------
// Tiny UI primitives (Tailwind)
// -----------------------------
function Card({ className, children, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "rounded-2xl border border-black/10 bg-white shadow-sm",
        onClick ? "cursor-pointer" : "",
        className
      )}
    >
      {children}
    </div>
  );
}


function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
      <div className="min-w-0">
        <div className="text-xl font-semibold tracking-tight">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-black/55 whitespace-normal break-words leading-snug">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function CardBody({ className, children }) {
  return <div className={cx("px-6 pb-6 pt-4", className)}>{children}</div>;
}

function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  onClick,
  children,
  title,
  type = "button",
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-black text-white hover:bg-black/90",
    secondary: "bg-white text-black border border-black/15 hover:bg-black/[0.03]",
    ghost: "bg-transparent text-black hover:bg-black/[0.04]",
    danger: "bg-red-600 text-white hover:bg-red-600/90",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base rounded-2xl",
  };
  return (
    <button
      type={type}
      title={title}
      className={cx(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Input({ className, ...props }) {
  return (
    <input
      className={cx(
        "h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-black/35",
        className
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cx(
        "min-h-[120px] w-full resize-y rounded-xl border border-black/15 bg-white p-3 text-sm outline-none transition focus:border-black/35",
        className
      )}
      {...props}
    />
  );
}

function Badge({ tone = "gray", children, className }) {
  const tones = {
    gray: "bg-black/[0.06] text-black/80",
    green: "bg-emerald-500/15 text-emerald-700",
    red: "bg-red-500/15 text-red-700",
    blue: "bg-blue-500/15 text-blue-700",
    yellow: "bg-amber-500/15 text-amber-800",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

function Divider() {
  return <div className="my-4 h-px w-full bg-black/10" />;
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full rounded-full bg-black/10">
      <div className="h-2 rounded-full bg-black transition-[width]" style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  );
}

function Kbd({ children }) {
  return <span className="rounded-md border border-black/15 bg-white px-2 py-0.5 text-xs text-black/70">{children}</span>;
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone = toast.type === "error" ? "red" : toast.type === "success" ? "green" : "gray";
  return (
    <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <div className="w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-black/10 bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge tone={tone}>{toast.type === "error" ? "失败" : toast.type === "success" ? "成功" : "提示"}</Badge>
              <div className="text-sm font-semibold truncate">{toast.title}</div>
            </div>
            {toast.message ? <div className="mt-2 text-sm text-black/65 whitespace-normal break-words leading-snug">{toast.message}</div> : null}
          </div>
          <button className="rounded-lg p-1 hover:bg-black/[0.05]" onClick={onClose}>
            <XCircle className="h-5 w-5 text-black/40" />
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// API client (real + mock)
// -----------------------------
function buildClient({ baseUrl, apiKey, useMock }) {
  const prefix = "/api/v1";
  const realBase = (baseUrl || "https://fwwb.sjbsjb.xyz").replace(/\/$/, "");

  async function realFetch(path, opts = {}) {
    const res = await fetch(`${realBase}${prefix}${path}`, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "X-API-Key": apiKey || "",
      },
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        msg = j?.error?.message || j?.message || msg;
      } catch {
        // ignore
      }
      const err = new Error(msg);
      err._status = res.status;
      throw err;
    }
    return res;
  }

  // ---- Mock engine ----
  const mockStore = {
    docsets: new Map(),
    templates: new Map(),
    jobs: new Map(),
  };

  function id(prefix) {
    return `${prefix}_${Math.random().toString(16).slice(2, 8)}${Math.random().toString(16).slice(2, 8)}`;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function mockHealth() {
    await sleep(220);
    return { ok: true, time: Date.now() };
  }

  async function mockCreateDocset(files, name) {
    await sleep(600 + Math.random() * 600);
    const docset_id = id("ds");
    const list = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
    mockStore.docsets.set(docset_id, { docset_id, files: list, name, created_at: Date.now() });
    return { docset_id, files: list, created_at: Date.now() };
  }

  async function mockUploadTemplate(file, name) {
    await sleep(500 + Math.random() * 600);
    const template_id = id("tp");
    const meta = { template_id, name: name || file.name, size: file.size, created_at: Date.now() };
    mockStore.templates.set(template_id, meta);
    return meta;
  }

  async function mockCreateJob(body) {
    await sleep(350 + Math.random() * 500);
    const job_id = id("job");
    const created_at = Date.now();
    const job = {
      job_id,
      status: "queued",
      stage: "uploading",
      outputs: [],
      error: null,
      created_at,
      updated_at: created_at,
      _input: body,
    };
    mockStore.jobs.set(job_id, job);

    (async () => {
      await sleep(800 + Math.random() * 800);
      const j1 = mockStore.jobs.get(job_id);
      if (!j1) return;
      j1.status = "running";
      j1.stage = "calling_openai";
      j1.updated_at = Date.now();

      await sleep(4500 + Math.random() * 6000);
      const j2 = mockStore.jobs.get(job_id);
      if (!j2) return;

      if (Math.random() < 0.12) {
        j2.status = "failed";
        j2.stage = "calling_openai";
        j2.error = {
          code: "OPENAI_ERROR",
          message: "Upstream failure (mock)",
          detail: { hint: "可点击重试（会创建新任务）" },
        };
        j2.outputs = [];
      } else {
        j2.status = "succeeded";
        j2.stage = "done";
        const ext = "xlsx";
        j2.outputs = [
          {
            filename: `filled_${Date.now()}_${Math.random().toString(16).slice(2, 6)}.${ext}`,
            download_url: `/api/v1/jobs/${job_id}/files/0`,
          },
        ];
        j2.error = null;
      }
      j2.updated_at = Date.now();
    })();

    return { job_id, status: "queued" };
  }

  async function mockGetJob(job_id) {
    await sleep(220 + Math.random() * 220);
    const job = mockStore.jobs.get(job_id);
    if (!job) throw new Error("job 不存在（mock）");
    return {
      job_id: job.job_id,
      status: job.status,
      stage: job.stage,
      outputs: job.outputs,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  }

  async function mockDownload(job_id) {
    await sleep(400);
    const content = `Mock file for ${job_id}
Generated at ${new Date().toISOString()}
`;
    return new Blob([content], { type: "application/octet-stream" });
  }

  return {
    async health() {
      if (useMock) return mockHealth();
      const res = await realFetch("/health", { method: "GET" });
      return res.json();
    },
    async createDocset({ files, name }) {
      if (useMock) return mockCreateDocset(files, name);
      const fd = new FormData();
      files.forEach((f) => fd.append("files[]", f));
      if (name) fd.append("name", name);
      const res = await realFetch("/docsets", { method: "POST", body: fd });
      return res.json();
    },
    async uploadTemplate({ file, name }) {
      if (useMock) return mockUploadTemplate(file, name);
      const fd = new FormData();
      fd.append("file", file);
      if (name) fd.append("name", name);
      const res = await realFetch("/templates", { method: "POST", body: fd });
      return res.json();
    },
    async createFillJob(payload) {
      if (useMock) return mockCreateJob(payload);
      const res = await realFetch("/jobs/fill-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    async getJob(job_id) {
      if (useMock) return mockGetJob(job_id);
      const res = await realFetch(`/jobs/${job_id}`, { method: "GET" });
      return res.json();
    },
    async downloadFile({ job_id, index = 0 }) {
      if (useMock) return mockDownload(job_id);
      const res = await realFetch(`/jobs/${job_id}/files/${index}`, { method: "GET" });
      return res.blob();
    },
  };
}

// -----------------------------
// Progress algorithm (to 99% ~45s)
// -----------------------------
function useFakeProgress({ running, succeeded, failed }) {
  const [progress, setProgress] = useState(0);
  const targetDurationRef = useRef(45000);
  const startedAtRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!running) {
      setProgress((p) => (succeeded ? 100 : failed ? p : 0));
      return;
    }

    startedAtRef.current = Date.now();
    targetDurationRef.current = 40000 + Math.random() * 15000;
    setProgress(0);

    const tick = () => {
      setProgress((p) => {
        if (succeeded) return 100;
        if (failed) return p;
        if (p >= 99) return 99;

        let next = p;
        if (p < 60) next += 2 + Math.random() * 4;
        else if (p < 90) next += 1 + Math.random() * 2;
        else next += 0.2 + Math.random() * 0.8;

        const elapsed = Date.now() - startedAtRef.current;
        const budgetRatio = elapsed / targetDurationRef.current;
        const expected = clamp(budgetRatio * 99, 0, 99);
        if (next > expected + 8) next = p + (next - p) * 0.35;

        return clamp(next, 0, 99);
      });

      const current = progress;
      const base = current < 60 ? 900 : current < 90 ? 1200 : 1700;
      const jitter = Math.random() * 500;
      tickRef.current = window.setTimeout(tick, base + jitter);
    };

    tickRef.current = window.setTimeout(tick, 700);

    return () => {
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (!succeeded) return;
    setProgress((p) => (p < 99 ? 99 : p));
    const t1 = window.setTimeout(() => setProgress(100), 380 + Math.random() * 420);
    return () => window.clearTimeout(t1);
  }, [succeeded]);

  return progress;
}

// -----------------------------
// Polling with backoff + visibility handling
// -----------------------------
function useJobPolling({ client, jobId, enabled, onUpdate }) {
  const backoffRef = useRef([1000, 2000, 3000, 5000, 8000, 10000]);
  const idxRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !jobId) return;

    let stopped = false;

    async function loop() {
      if (stopped) return;
      try {
        const data = await client.getJob(jobId);
        onUpdate?.(data);
        if (["succeeded", "failed", "canceled"].includes(data.status)) return;
      } catch {
        // ignore
      }

      const hidden = document.hidden;
      const base = backoffRef.current[idxRef.current] ?? 10000;
      const wait = hidden ? 10000 : base;
      idxRef.current = Math.min(idxRef.current + 1, backoffRef.current.length - 1);
      timerRef.current = window.setTimeout(loop, wait);
    }

    idxRef.current = 0;
    timerRef.current = window.setTimeout(loop, 350);

    return () => {
      stopped = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [client, enabled, jobId, onUpdate]);
}

// -----------------------------
// App
// -----------------------------
export default function AutoFillWebApp() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, "") || "/home");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace(/^#/, "") || "/home");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (path) => {
    window.location.hash = path;
  };

  // Settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS.apiKey) || "");
  // 从主站跳转时自动读取 ?key=... 并写入 X-API-Key（存入本地设置）
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search || "");
      const k = (sp.get("key") || "").trim();
      if (!k) return;

      // 写入本地配置（后续所有请求都会带 X-API-Key）
      setApiKey(k);

      // 可选：清理地址栏参数（避免重复导入），保留 hash 路由
      sp.delete("key");
      const qs = sp.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash || ""}`;
      window.history.replaceState({}, "", next);

      showToast({ type: "success", title: "已自动导入密钥", message: "已从链接参数 key 写入 X-API-Key。" });
    } catch {
      // ignore
    }
  }, []);
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem(LS.baseUrl) || "https://fwwb.sjbsjb.xyz");
  const [useMock, setUseMock] = useState(() => (localStorage.getItem(LS.useMock) ?? "false") === "true");

  useEffect(() => localStorage.setItem(LS.apiKey, apiKey), [apiKey]);
  useEffect(() => localStorage.setItem(LS.baseUrl, baseUrl), [baseUrl]);
  useEffect(() => localStorage.setItem(LS.useMock, String(useMock)), [useMock]);

  // Jobs store
  const [jobs, setJobs] = useState(() => loadJobs());
  useEffect(() => saveJobs(jobs), [jobs]);

  // beforeunload intercept when running
  useEffect(() => {
    const hasRunning = jobs.some((j) => ["queued", "running"].includes(j.status));
    const handler = (e) => {
      if (!jobs.some((j) => ["queued", "running"].includes(j.status))) return;
      e.preventDefault();
      e.returnValue = "";
    };
    if (hasRunning) window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [jobs]);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (t) => {
    setToast(t);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3500);
  };

  const client = useMemo(() => buildClient({ baseUrl, apiKey, useMock }), [baseUrl, apiKey, useMock]);

  // Restore polling for any running jobs (background)
  const runningIds = useMemo(
    () => jobs.filter((j) => ["queued", "running"].includes(j.status)).map((j) => j.job_id),
    [jobs]
  );
  const bgIndexRef = useRef(0);
  useEffect(() => {
    if (runningIds.length === 0) return;

    let cancelled = false;

    async function round() {
      if (cancelled) return;
      const id = runningIds[bgIndexRef.current % runningIds.length];
      bgIndexRef.current++;
      try {
        const data = await client.getJob(id);
        setJobs((prev) => upsertJob({ job_id: id, ...data }, prev));
      } catch {
        // ignore
      }
      const wait = document.hidden ? 10000 : 5000;
      window.setTimeout(round, wait);
    }

    const t = window.setTimeout(round, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [client, runningIds]);

  const section = route.startsWith("/quick-create")
    ? "quick"
    : route.startsWith("/jobs")
      ? "jobs"
      : route.startsWith("/guides")
        ? "guides"
        : route.startsWith("/support")
          ? "support"
          : route.startsWith("/settings")
            ? "settings"
            : "home";

  const content = (() => {
    if (route.startsWith("/quick-create")) {
      return (
        <QuickCreatePage
          client={client}
          jobs={jobs}
          setJobs={setJobs}
          useMock={useMock}
          apiKey={apiKey}
          onToast={showToast}
          onNavigate={navigate}
        />
      );
    }
    if (route.startsWith("/jobs/")) {
      const jobId = route.split("/")[2];
      return <JobDetailPage client={client} jobs={jobs} setJobs={setJobs} jobId={jobId} onToast={showToast} onNavigate={navigate} />;
    }
    if (route.startsWith("/jobs")) {
      return <JobsPage client={client} jobs={jobs} setJobs={setJobs} onToast={showToast} onNavigate={navigate} />;
    }
    if (route.startsWith("/guides")) return <GuidesPage onNavigate={navigate} mode="guides" />;
    if (route.startsWith("/support")) return <GuidesPage onNavigate={navigate} mode="support" />;
    if (route.startsWith("/settings")) {
      return (
        <SettingsPage
          apiKey={apiKey}
          setApiKey={setApiKey}
          baseUrl={baseUrl}
          setBaseUrl={setBaseUrl}
          useMock={useMock}
          setUseMock={setUseMock}
          onToast={showToast}
          onClearJobs={() => {
            setJobs([]);
            showToast({ type: "success", title: "已清空任务缓存" });
          }}
        />
      );
    }
    return <HomePage jobs={jobs} onNavigate={navigate} />;
  })();

  // Responsive shell
  const isDesktop = useIsDesktop(1024);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    if (isDesktop) setMobileNavOpen(false);
  }, [isDesktop]);

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-black">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b border-black/10 bg-[#f6f6f7] lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium hover:bg-black/[0.02]"
          >
            <Menu className="h-4.5 w-4.5" />
            菜单
          </button>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold">AutoFill</div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {!isDesktop && mobileNavOpen ? (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/25" onClick={() => setMobileNavOpen(false)} />
            <motion.aside
              className="absolute left-0 top-0 h-full w-[284px] border-r border-black/10 bg-white"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <div className="flex items-center justify-between px-4 py-4">
                <div className="text-sm font-semibold">导航</div>
                <button className="rounded-xl p-2 hover:bg-black/[0.05]" onClick={() => setMobileNavOpen(false)}>
                  <X className="h-5 w-5 text-black/60" />
                </button>
              </div>
              <SidebarInner
                section={section}
                onNavigate={(p) => {
                  navigate(p);
                  setMobileNavOpen(false);
                }}
                apiKey={apiKey}
                useMock={useMock}
                compact
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[264px] border-r border-black/10 bg-white lg:block">
          <SidebarInner section={section} onNavigate={navigate} apiKey={apiKey} useMock={useMock} />
        </aside>

        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="min-h-[calc(100vh-64px)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={route}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {content}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-10 flex flex-col gap-3 text-xs text-black/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">AutoFill</span>
                <span>·</span>
                <span>Web v1.0（预览）</span>
              </div>
              <div className="flex items-center gap-2">
                <span>快捷键：</span>
                <Kbd>⌘</Kbd> <Kbd>K</Kbd>
                <span className="hidden sm:inline">（演示用）</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// -----------------------------
// Sidebar inner
// -----------------------------
function SidebarInner({ section, onNavigate, apiKey, useMock, compact }) {
  const nav = [
    { key: "home", label: "主页", icon: LayoutGrid, path: "/home" },
    { key: "quick", label: "快速新建", icon: Wand2, path: "/quick-create", primary: true },
    { key: "jobs", label: "任务列表", icon: ListChecks, path: "/jobs" },
  ];
  const foot = [
    { key: "support", label: "支持", icon: HelpCircle, path: "/support" },
    { key: "guides", label: "指南", icon: BookOpen, path: "/guides" },
    { key: "settings", label: "设置", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className={cx("px-6 pt-6", compact ? "pt-2" : "")}> 
        <button onClick={() => onNavigate("/home")} className="flex w-full items-center gap-2 rounded-xl px-2 py-1 hover:bg-black/[0.03]">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">AutoFill</div>
            <div className="text-xs text-black/45">自动填表</div>
          </div>
        </button>
      </div>

      <div className={cx("mt-6 px-3", compact ? "mt-3" : "")}>
        {nav.map((it) => {
          const Icon = it.icon;
          const active = section === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onNavigate(it.path)}
              className={cx(
                "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active ? "bg-black/[0.05]" : "hover:bg-black/[0.03]",
                it.primary ? "font-semibold" : "font-medium"
              )}
            >
              <div
                className={cx(
                  "grid h-8 w-8 place-items-center rounded-xl",
                  it.primary ? "bg-black text-white" : "bg-black/[0.05] text-black"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 text-left">{it.label}</div>
              {it.primary ? <Badge tone="blue">Primary</Badge> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-auto px-3 pb-4">
        <div className="mb-3 px-3 text-xs text-black/40">Support</div>
        {foot.map((it) => {
          const Icon = it.icon;
          const active = section === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onNavigate(it.path)}
              className={cx(
                "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active ? "bg-black/[0.05]" : "hover:bg-black/[0.03]"
              )}
            >
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-black/[0.05]">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 text-left">{it.label}</div>
            </button>
          );
        })}

        <div className="mt-4 rounded-2xl border border-black/10 bg-[#fafafa] p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-white">
              <span className="text-sm font-semibold">A</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">服务外包专用账户</div>
              <div className="truncate text-xs text-black/45">{useMock ? "Mock 模式" : apiKey ? "已配置 API Key" : "未配置 API Key"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Home
// -----------------------------
function HomePage({ jobs, onNavigate }) {
  const recent = jobs.slice(0, 5);

  // 概览指标
  const runningCount = useMemo(
    () => jobs.filter((j) => ["queued", "running"].includes(j.status)).length,
    [jobs]
  );
  const todayDoneCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startTs = start.getTime();
    return jobs.filter((j) => {
      if (j.status !== "succeeded") return false;
      const t = j.updated_at || j.created_at || j.local_created_at || 0;
      return t >= startTs;
    }).length;
  }, [jobs]);

  const failedCount = useMemo(
    () => jobs.filter((j) => j.status === "failed").length,
    [jobs]
  );

  const avgSec = useMemo(() => {
    // 近 10 次有“开始与结束”时间的任务：用 created/local_created 到 updated_at 估算
    // 成功/失败都算“已结束”，避免 running 拉低准确度
    const ended = jobs
      .filter((j) => ["succeeded", "failed", "canceled"].includes(j.status))
      .sort(
        (a, b) =>
          (b.updated_at || b.created_at || b.local_created_at || 0) -
          (a.updated_at || a.created_at || a.local_created_at || 0)
      )
      .slice(0, 10);

    const durations = ended
      .map((j) => {
        const start = j.created_at || j.local_created_at;
        const end = j.updated_at;
        if (!start || !end) return null;
        const ms = Math.max(0, end - start);
        return ms;
      })
      .filter((x) => typeof x === "number");

    if (!durations.length) return null;
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    return Math.round(avgMs / 1000);
  }, [jobs]);

  const goJobs = (filter) => {
    const base = "/jobs";
    if (!filter || filter === "all") onNavigate(base);
    else onNavigate(`${base}?filter=${encodeURIComponent(filter)}`);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="text-3xl font-semibold tracking-tight">自动填表</div>
        <div className="mt-2 text-sm text-black/55">上传资料包 + 模板，自动生成填好的 Word/Excel，并可追踪任务状态。</div>
      </div>

      {/* 概览指标卡 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-black/[0.01]" onClick={() => goJobs("running")}>
          <CardBody className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-black/45">运行中</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{runningCount}</div>
                <div className="mt-1 text-xs text-black/45">点击查看运行中任务</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
                <Activity className="h-5 w-5 text-black/70" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="cursor-pointer hover:bg-black/[0.01]" onClick={() => goJobs("succeeded")}>
          <CardBody className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-black/45">今日完成</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{todayDoneCount}</div>
                <div className="mt-1 text-xs text-black/45">点击查看今日已完成</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="cursor-pointer hover:bg-black/[0.01]" onClick={() => goJobs("failed")}>
          <CardBody className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-black/45">失败 / 需处理</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{failedCount}</div>
                <div className="mt-1 text-xs text-black/45">点击查看失败原因</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-700" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="cursor-pointer hover:bg-black/[0.01]" onClick={() => goJobs("all")}>
          <CardBody className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-black/45">最近平均耗时</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{avgSec == null ? "—" : `${avgSec}s`}</div>
                <div className="mt-1 text-xs text-black/45">近 10 次平均（估算）</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/10">
                <Loader2 className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="快速新建"
            subtitle="四步引导：上传文档 → 上传模板 →（可选）高级设置 → 生成并下载"
            right={
              <Button size="md" onClick={() => onNavigate("/quick-create")}> 
                <Wand2 className="h-4.5 w-4.5" />
                去新建
              </Button>
            }
          />
          <CardBody>
            <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4 text-sm text-black/65">
              <div className="font-medium text-black">建议流程</div>
              <ol className="mt-2 list-decimal pl-5">
                <li>先上传 1~8 个资料文件（doc/docx/md/txt/xls/xlsx）</li>
                <li>再上传模板（doc/docx/xls/xlsx）</li>
                <li>默认使用 async 模式（更稳）</li>
                <li>生成完成后直接下载交付物</li>
              </ol>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="最近任务"
            subtitle={recent.length ? "最近 5 条任务（按创建时间倒序）" : "还没有任务：从快速新建开始"}
            right={<Button variant="secondary" onClick={() => onNavigate("/jobs")}>查看全部</Button>}
          />
          <CardBody>
            {recent.length ? (
              <div className="space-y-3">
                {recent.map((j) => (
                  <button
                    key={j.job_id}
                    onClick={() => onNavigate(`/jobs/${j.job_id}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white p-4 text-left hover:bg-black/[0.02]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{j.template_file?.name || "未命名模板"}</div>
                      <div className="mt-1 truncate text-xs text-black/45">{formatTime(j.created_at || j.local_created_at || Date.now())}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={j.status} />
                      <ChevronRight className="h-4 w-4 text-black/30" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid place-items-center rounded-2xl border border-dashed border-black/15 bg-[#fafafa] p-10 text-center">
                <div className="text-sm font-medium">暂无任务</div>
                <div className="mt-1 text-sm text-black/55">点击“去新建”开始。</div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}


// -----------------------------
// Placeholder
// -----------------------------
function PlaceholderPage({ title, subtitle, icon: Icon }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} right={<Badge tone="gray">占位</Badge>} />
      <CardBody>
        <div className="grid place-items-center rounded-2xl border border-dashed border-black/15 bg-[#fafafa] p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-black text-white">
            <Icon className="h-6 w-6" />
          </div>
          <div className="mt-4 text-base font-semibold">{title} 页面</div>
          <div className="mt-2 max-w-[520px] text-sm text-black/55">{subtitle}</div>
        </div>
      </CardBody>
    </Card>
  );
}

// -----------------------------
// Guides / Support（比赛说明页）
// -----------------------------
function GuidesPage({ onNavigate, mode = "guides" }) {
  const [tab, setTab] = useState(() => (mode === "support" ? "faq" : "howto"));

  const tabs = [
    { key: "howto", label: "如何操作" },
    { key: "principle", label: "运行原理" },
    { key: "faq", label: "排错与支持" },
  ];

  const promptSnippets = [
    {
      title: "默认（稳健通用）",
      text: "请读取文档集并自动填写模板。对每个字段先定位证据片段，再写入模板；缺失则填\"-\"并在备注列标注缺失原因。只输出最终填好的文件，不要输出中间过程。",
      tip: "适用于大多数办公资料包与台账模板。",
    },
    {
      title: "只填指定列（精准投产）",
      text: "仅填写模板中的：项目名称、合同金额、开票信息、联系人、联系电话、日期。其余字段保持原样不改。若出现同名实体冲突，以最新日期的记录为准。",
      tip: "适用于模板列较多、只想先跑关键字段的场景。",
    },
    {
      title: "强规范（面向入库/汇总）",
      text: "抽取字段时强制标准化：日期统一YYYY-MM-DD；金额统一到元并保留2位小数；电话仅保留数字；缺失字段填\"N/A\"。输出需满足可直接入库校验。",
      tip: "适用于需要结构化入库、后续统计分析的场景。",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-3xl font-semibold tracking-tight">{mode === "support" ? "支持与指南" : "指南"}</div>
          <div className="mt-2 text-sm text-black/55 whitespace-normal break-words leading-snug">
            面向“非结构化文档 → 结构化数据 → 模板自动填充”的端到端工作流说明：从使用方法到系统机制，一页讲清。
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => onNavigate("/quick-create")}> 
            <Wand2 className="h-4.5 w-4.5" />
            去快速新建
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("/jobs")}> 
            <ListChecks className="h-4.5 w-4.5" />
            任务列表
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("/settings")}> 
            <Settings className="h-4.5 w-4.5" />
            设置
          </Button>
        </div>
      </div>

      {/* 视觉化概览 */}
      <Card>
        <CardHeader
          title="系统能力概览"
          subtitle="对齐比赛要求：自然语言交互、信息抽取与结构化、模板自动填写与交付。"
          right={<Badge tone="blue">v1.0 工作流</Badge>}
        />
        <CardBody>
          <div className="grid gap-4 md:grid-cols-3">
            <GuideKpi
              icon={Wand2}
              title="文档智能操作交互"
              desc="自然语言指令 → 结构化意图 → 工具链编排与执行"
              bullets={["指令解析与约束", "可追溯操作链", "低门槛引导"]}
            />
            <GuideKpi
              icon={FileText}
              title="非结构化信息提取"
              desc="多格式接入 → 语义理解 → 实体/字段抽取与规范化"
              bullets={["格式适配与解析", "语义定位与证据", "结构化写入"]}
            />
            <GuideKpi
              icon={Upload}
              title="表格自定义数据填写"
              desc="模板结构理解 → 字段映射 → 样式保真填充输出"
              bullets={["字段映射引擎", "校验与回填策略", "一键下载交付"]}
            />
          </div>

          <Divider />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">端到端工作流（可视化）</div>
              <div className="mt-1 text-sm text-black/55 whitespace-normal break-words leading-snug">
                从“资料包”到“可直接业务应用的汇总表/合同/台账”，通过任务化编排与质量控制完成自动化交付。
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-black/45">
              <span className="inline-flex items-center gap-1"><Badge tone="gray">DocSet</Badge>资料集</span>
              <span>→</span>
              <span className="inline-flex items-center gap-1"><Badge tone="gray">Template</Badge>模板</span>
              <span>→</span>
              <span className="inline-flex items-center gap-1"><Badge tone="gray">Job</Badge>任务</span>
            </div>
          </div>

          <div className="mt-4">
            <FlowDiagram
              stages={[
                { icon: Upload, title: "多源接入", desc: "doc/docx/md/txt/xls/xlsx（可扩展）" },
                { icon: FileText, title: "结构理解", desc: "文档分段、表格/段落语义对齐" },
                { icon: Wand2, title: "语义抽取", desc: "实体识别、字段定位、证据链构建" },
                { icon: ListChecks, title: "质量校验", desc: "约束检查、冲突消解、缺失策略" },
                { icon: Download, title: "模板渲染", desc: "样式保真回填并生成可下载文件" },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "primary" : "secondary"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "howto" ? (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="三分钟上手"
              subtitle="按“快速新建”四步走：资料包 → 模板 → 指令 → 生成与下载。"
              right={<Badge tone="gray">面向非技术用户</Badge>}
            />
            <CardBody>
              <div className="grid gap-4 lg:grid-cols-4">
                <HowToStep
                  n={1}
                  title="上传资料包"
                  icon={Upload}
                  points={["最多 8 个文件", "支持 doc/docx/xls/xlsx/md/txt", "可删除与重新选择"]}
                />
                <HowToStep
                  n={2}
                  title="上传模板"
                  icon={FileText}
                  points={["单文件模板", "支持 doc/docx/xls/xlsx", "再次上传会替换"]}
                />
                <HowToStep
                  n={3}
                  title="编写业务指令"
                  icon={Wand2}
                  points={["默认值即可跑通", "可指定只填某些列", "可定义缺失字段策略"]}
                />
                <HowToStep
                  n={4}
                  title="生成与下载"
                  icon={Download}
                  points={["任务状态可追踪", "完成后下载交付物", "失败可一键重试"]}
                />
              </div>

              <Divider />

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="bg-white">
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">操作要点</div>
                        <ul className="mt-2 list-disc pl-5 text-sm text-black/65">
                          <li>资料包建议包含：业务说明、合同/台账、会议纪要、附件清单等。</li>
                          <li>模板越“字段清晰”，自动对齐越快（例如列名规范、口径统一）。</li>
                          <li>不确定怎么写 Prompt：先用默认，再逐步加约束（只填哪些列/格式规则）。</li>
                        </ul>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
                        <CheckCircle2 className="h-5 w-5 text-black/70" />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-white">
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">常见场景</div>
                        <div className="mt-2 grid gap-2 text-sm text-black/65">
                          <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-3">台账自动补全：多份资料合并补齐缺失字段。</div>
                          <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-3">投标/报告汇总：从附件中抽取关键指标形成汇总表。</div>
                          <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-3">运营交付：批量跑任务、失败重试、统一下载。</div>
                        </div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
                        <LayoutGrid className="h-5 w-5 text-black/70" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="业务指令（Prompt）怎么写"
              subtitle="把“你希望系统做什么”说清楚：要填哪些字段、缺失怎么处理、格式怎么统一。"
              right={<Badge tone="blue">可复制</Badge>}
            />
            <CardBody>
              <div className="grid gap-4 lg:grid-cols-3">
                {promptSnippets.map((p) => (
                  <PromptSnippet key={p.title} title={p.title} text={p.text} tip={p.tip} />
                ))}
              </div>

              <Divider />

              <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4 text-sm text-black/65">
                <div className="font-semibold text-black">写作公式（记住这 3 件事）</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <FormulaCard title="范围" desc="只填哪些列/哪些页？" example="仅填写：金额、日期、联系人" />
                  <FormulaCard title="口径" desc="字段如何标准化？" example="金额统一到元并保留2位" />
                  <FormulaCard title="例外" desc="缺失/冲突怎么处理？" example="缺失填“-”，冲突以最新为准" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "principle" ? (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="运行原理（高层机制）"
              subtitle="以“语义理解 + 工具编排 + 质量控制”为核心，将非结构化信息稳定转化为结构化数据与可交付文件。"
              right={<Badge tone="gray">面向评审/答辩</Badge>}
            />
            <CardBody>
              <div className="grid gap-4 lg:grid-cols-2">
                <PrincipleBlock
                  title="① 文档规范化与结构理解"
                  icon={FileText}
                  points={[
                    "多格式接入后统一转换为内部中间表示（段落/表格/单元格/元数据）。",
                    "对标题层级、表格结构、关键段落进行结构标注与语义分块。",
                    "构建可检索的文档索引，支持跨文件的证据定位与引用。",
                  ]}
                />
                <PrincipleBlock
                  title="② 语义抽取与字段决策"
                  icon={Wand2}
                  points={[
                    "通过语义推理将用户指令转为字段目标、约束与优先级。",
                    "对字段进行实体识别、数值/日期归一化与上下文消歧。",
                    "在“证据片段 → 字段值”之间建立可追溯链路，便于审计与复核。",
                  ]}
                />
                <PrincipleBlock
                  title="③ 质量控制与一致性校验"
                  icon={ListChecks}
                  points={[
                    "对类型、范围、格式、必填项进行字段级约束校验。",
                    "冲突消解：同名字段多来源时按时间/可信度/规则优先级裁决。",
                    "缺失策略：明确填充占位符与备注解释，避免“静默缺失”。",
                  ]}
                />
                <PrincipleBlock
                  title="④ 模板回填与样式保真"
                  icon={Download}
                  points={[
                    "解析模板的结构与语义槽位（表头、合并单元格、样式区域）。",
                    "字段映射引擎将结构化结果对齐到单元格/占位符并保持格式一致。",
                    "生成最终文件并通过任务输出下载，满足直接业务使用与交付。",
                  ]}
                />
              </div>

              <Divider />

              <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">任务化编排（Job 生命周期）</div>
                    <div className="mt-1 text-sm text-black/55 whitespace-normal break-words leading-snug">
                      通过异步任务模型实现可靠交付：可追踪、可恢复、可重试、可审计。
                    </div>
                  </div>
                  <Badge tone="blue">queued → running → succeeded/failed</Badge>
                </div>
                <div className="mt-4">
                  <FlowDiagram
                    compact
                    stages={[
                      { icon: Upload, title: "queued", desc: "参数校验与排队" },
                      { icon: Loader2, title: "running", desc: "抽取/对齐/校验" },
                      { icon: CheckCircle2, title: "succeeded", desc: "生成输出可下载" },
                      { icon: XCircle, title: "failed", desc: "保留错误与可重试" },
                    ]}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="三大关键模块（对齐比赛条目）"
              subtitle="把能力拆成模块化组件，便于部署到 Web/桌面端/第三方平台并持续扩展。"
            />
            <CardBody>
              <div className="grid gap-4 md:grid-cols-3">
                <ModuleCard
                  title="文档智能操作交互模块"
                  icon={HelpCircle}
                  lines={[
                    "自然语言 → 意图解析 → 操作计划生成",
                    "按用户目标自动选择工具：上传、抽取、填表、导出",
                    "提供可解释的状态与可控的重试策略",
                  ]}
                />
                <ModuleCard
                  title="非结构化文档信息提取模块"
                  icon={FileText}
                  lines={[
                    "多文件融合：跨文档实体对齐与去重",
                    "字段级归一化：日期/金额/编号等标准化",
                    "存储准备：结构化输出可用于入库与汇总",
                  ]}
                />
                <ModuleCard
                  title="表格自定义数据填写模块"
                  icon={LayoutGrid}
                  lines={[
                    "模板结构理解：表头语义与单元格范围",
                    "字段映射：从结果集定位到模板槽位",
                    "样式保真：保持原表格式、合并与公式区域",
                  ]}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "faq" ? (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="排错与支持"
              subtitle="覆盖最常见的“连通性/跨域/文件上传/任务轮询”问题。"
              right={<Badge tone="yellow">Troubleshooting</Badge>}
            />
            <CardBody>
              <div className="grid gap-4 lg:grid-cols-2">
                <TroubleCard
                  title="健康检查 Failed to fetch"
                  icon={Activity}
                  items={[
                    "HTTPS 预览页面请求 HTTP 会被浏览器拦截（Mixed Content）。Base URL 必须使用 https://。",
                    "带 X-API-Key 等自定义 Header 会触发 CORS 预检（OPTIONS）。后端需放行 OPTIONS，并允许 Access-Control-Allow-Headers: X-API-Key。",
                    "如果地址栏能打开但 fetch 不行，通常是后端未返回 Access-Control-Allow-Origin。",
                  ]}
                />
                <TroubleCard
                  title="上传/下载失败或超时"
                  icon={Upload}
                  items={[
                    "检查文件大小限制（413）与后端上传配置；可分批上传或压缩。",
                    "确保后端正确设置 Content-Disposition（含文件名编码），避免移动端下载异常。",
                    "建议使用 async 模式：浏览器断网/切后台也能恢复轮询。",
                  ]}
                />
                <TroubleCard
                  title="任务一直 running / 进度卡住"
                  icon={Loader2}
                  items={[
                    "前端进度条为“用户体验增强”，真实状态以 /jobs/{job_id} 为准。",
                    "切后台会降低轮询频率（省资源）；回到前台会恢复。",
                    "超过较长时间仍未结束：建议刷新任务状态或点击重试（会创建新 job）。",
                  ]}
                />
                <TroubleCard
                  title="结果不符合预期（字段缺失/口径不一致）"
                  icon={ListChecks}
                  items={[
                    "在 Prompt 明确：要填哪些列、格式标准、冲突裁决规则、缺失如何标注。",
                    "模板表头建议使用业务口径一致的字段名（例如“合同金额(元)”）。",
                    "对关键字段启用“强规范”模板：日期/金额/编号统一化有助于稳定产出。",
                  ]}
                />
              </div>

              <Divider />

              <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4 text-sm text-black/65">
                <div className="font-semibold text-black">需要更深入的帮助？</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <SupportAction title="先确认设置" desc="检查 Base URL / Key / 是否开启 Mock" onClick={() => onNavigate("/settings")} />
                  <SupportAction title="查看任务详情" desc="在任务详情页复制请求体/响应用于排查" onClick={() => onNavigate("/jobs")} />
                  <SupportAction title="重新跑一遍" desc="使用更明确的 Prompt（只填哪些列/缺失策略）" onClick={() => onNavigate("/quick-create")} />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function GuideKpi({ icon: Icon, title, desc, bullets }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold whitespace-normal break-words">{title}</div>
          <div className="mt-1 text-sm text-black/55 whitespace-normal break-words leading-snug">{desc}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <ul className="mt-3 list-disc pl-5 text-sm text-black/65">
        {bullets.map((b) => (
          <li key={b} className="whitespace-normal break-words">{b}</li>
        ))}
      </ul>
    </div>
  );
}

function HowToStep({ n, title, icon: Icon, points }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-black/45">Step {n}</div>
          <div className="mt-1 text-sm font-semibold whitespace-normal break-words">{title}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
          <Icon className="h-5 w-5 text-black/70" />
        </div>
      </div>
      <ul className="mt-3 list-disc pl-5 text-sm text-black/65">
        {points.map((p) => (
          <li key={p} className="whitespace-normal break-words">{p}</li>
        ))}
      </ul>
    </div>
  );
}

function FlowDiagram({ stages, compact }) {
  return (
    <div className={cx("flex flex-col", compact ? "gap-2" : "gap-3") }>
      <div className={cx("flex flex-col items-stretch", compact ? "gap-2" : "gap-3", "lg:flex-row lg:items-center")}> 
        {stages.map((s, idx) => {
          const Icon = s.icon;
          return (
            <React.Fragment key={s.title}>
              <div className={cx("flex-1 rounded-2xl border border-black/10 bg-white", compact ? "p-3" : "p-4")}> 
                <div className="flex items-start gap-3">
                  <div className={cx("grid shrink-0 place-items-center rounded-2xl", compact ? "h-9 w-9" : "h-10 w-10", "bg-black/[0.06]")}> 
                    <Icon className={cx(compact ? "h-4.5 w-4.5" : "h-5 w-5", s.title === "running" ? "animate-spin" : "", "text-black/70")} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold whitespace-normal break-words">{s.title}</div>
                    <div className="mt-1 text-sm text-black/55 whitespace-normal break-words leading-snug">{s.desc}</div>
                  </div>
                </div>
              </div>
              {idx < stages.length - 1 ? (
                <div className="hidden lg:flex shrink-0 items-center justify-center px-1">
                  <ChevronRight className="h-5 w-5 text-black/25" />
                </div>
              ) : null}
              {idx < stages.length - 1 ? (
                <div className="flex lg:hidden shrink-0 items-center justify-center">
                  <ChevronRight className="h-5 w-5 rotate-90 text-black/25" />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function PromptSnippet({ title, text, tip }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold whitespace-normal break-words">{title}</div>
          <div className="mt-1 text-xs text-black/45 whitespace-normal break-words">{tip}</div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch {
              // ignore
            }
          }}
        >
          <Copy className="h-4 w-4" />
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <pre className="mt-3 max-h-[220px] overflow-auto rounded-xl bg-black/[0.03] p-3 text-xs leading-relaxed text-black/75 whitespace-pre-wrap break-words">{text}</pre>
    </div>
  );
}

function FormulaCard({ title, desc, example }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-black/55 whitespace-normal break-words leading-snug">{desc}</div>
      <div className="mt-3 rounded-xl bg-black/[0.03] p-3 text-xs text-black/70 whitespace-normal break-words">例：{example}</div>
    </div>
  );
}

function PrincipleBlock({ title, icon: Icon, points }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-black text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold whitespace-normal break-words">{title}</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-black/65">
            {points.map((p) => (
              <li key={p} className="whitespace-normal break-words">{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ title, icon: Icon, lines }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold whitespace-normal break-words">{title}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/[0.06]">
          <Icon className="h-5 w-5 text-black/70" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {lines.map((l) => (
          <div key={l} className="rounded-xl bg-black/[0.03] p-3 text-sm text-black/65 whitespace-normal break-words">{l}</div>
        ))}
      </div>
    </div>
  );
}

function TroubleCard({ title, icon: Icon, items }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-black/[0.06]">
          <Icon className={cx("h-5 w-5 text-black/70", title.includes("running") ? "animate-spin" : "")} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold whitespace-normal break-words">{title}</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-black/65">
            {items.map((it) => (
              <li key={it} className="whitespace-normal break-words leading-snug">{it}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SupportAction({ title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-black/10 bg-white p-4 text-left hover:bg-black/[0.02]"
    >
      <div className="text-sm font-semibold whitespace-normal break-words">{title}</div>
      <div className="mt-1 text-sm text-black/55 whitespace-normal break-words leading-snug">{desc}</div>
      <div className="mt-3 inline-flex items-center gap-1 text-xs text-black/45">
        前往 <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

// -----------------------------
// Settings
// -----------------------------
function SettingsPage({ apiKey, setApiKey, baseUrl, setBaseUrl, useMock, setUseMock, onToast, onClearJobs }) {
  const [masked, setMasked] = useState(true);
  const [health, setHealth] = useState({ state: "idle", message: "" });
  const timerRef = useRef(null);
  const lastFailRef = useRef("");

  // 自动健康检查：用户修改 baseUrl / apiKey 后进行（关闭 Mock 时）
  // 说明：在 ChatGPT 预览环境里页面通常是 HTTPS，如果你填的是 http:// 会被浏览器 Mixed Content 阻止，表现为 Failed to fetch。
  // 另外：带自定义 Header（X-API-Key）会触发 CORS 预检（OPTIONS），如果后端没放行也会 Failed to fetch。
  useEffect(() => {
    if (useMock) {
      setHealth({ state: "idle", message: "" });
      return;
    }

    const raw = (baseUrl || "").trim();
    if (!raw) return;

    const pageProto = typeof window !== "undefined" ? window.location.protocol : "https:";

    // 1) Mixed Content：HTTPS 页面请求 HTTP 会直接被浏览器拦截（不会真的发出请求）
    if (pageProto === "https:" && /^http:\/\//i.test(raw)) {
      const msg = "当前预览页面为 HTTPS，浏览器会阻止请求 HTTP（Mixed Content）。请把 Base URL 改为 https://... 或给测试域名配置 TLS/反向代理。";
      setHealth({ state: "fail", message: msg });
      const sig = `mixed|${raw}`;
      if (sig !== lastFailRef.current) {
        lastFailRef.current = sig;
        onToast({ type: "error", title: "健康检查失败", message: msg });
      }
      return;
    }

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      const realBase = raw.replace(/\/+$/, "");
      const url = `${realBase}/api/v1/health`;

      try {
        setHealth({ state: "checking", message: "" });

        // 2) 先做“可达性”检查：不带自定义 Header，尽量避免触发预检
        let res;
        try {
          res = await fetch(url, { method: "GET" });
        } catch (e) {
          // 这里大概率是：CORS 未配置 / DNS 不通 / 被拦截
          const msg = "Failed to fetch（可能是 CORS 未配置、域名无法解析、网络被拦截或服务不可达）。如果你能在地址栏打开，但 fetch 失败，通常是后端缺少 Access-Control-Allow-Origin / 未处理 OPTIONS。";
          setHealth({ state: "fail", message: msg });
          const sig = `${realBase}|reach|${msg}`;
          if (sig !== lastFailRef.current) {
            lastFailRef.current = sig;
            onToast({ type: "error", title: "健康检查失败", message: msg });
          }
          return;
        }

        // 3) 如果后端对 health 强制鉴权，这里可能返回 401 —— 但至少说明“服务可达”
        if (res.status === 401) {
          const msg = "服务可达，但 health 接口返回 401：未配置或无效的 API Key（或后端对 health 也要求鉴权）。";
          setHealth({ state: "fail", message: msg });
          const sig = `${realBase}|401|${apiKey}`;
          if (sig !== lastFailRef.current) {
            lastFailRef.current = sig;
            onToast({ type: "error", title: "健康检查失败", message: msg });
          }
          return;
        }

        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = await res.json();
            msg = j?.error?.message || j?.message || msg;
          } catch {
            // ignore
          }
          setHealth({ state: "fail", message: msg });
          const sig = `${realBase}|${apiKey}|${msg}`;
          if (sig !== lastFailRef.current) {
            lastFailRef.current = sig;
            onToast({ type: "error", title: "健康检查失败", message: msg });
          }
          return;
        }

        // 4) 可选：如果用户填了 API Key，再用带 X-API-Key 的方式校验一次（这一步可能触发预检）
        if (apiKey) {
          try {
            const res2 = await fetch(url, {
              method: "GET",
              headers: { "X-API-Key": apiKey },
            });
            if (!res2.ok) {
              let msg = `HTTP ${res2.status}`;
              if (res2.status === 401) msg = "未配置或无效的 API Key";
              else {
                try {
                  const j = await res2.json();
                  msg = j?.error?.message || j?.message || msg;
                } catch {
                  // ignore
                }
              }
              setHealth({ state: "fail", message: msg });
              const sig = `${realBase}|keycheck|${msg}`;
              if (sig !== lastFailRef.current) {
                lastFailRef.current = sig;
                onToast({ type: "error", title: "健康检查失败", message: msg });
              }
              return;
            }
          } catch {
            // 这里多半是 CORS 预检（OPTIONS）未放行 X-API-Key
            const msg = "服务可达，但带 X-API-Key 的请求被浏览器拦截（通常是后端未正确配置 CORS/OPTIONS，未放行 X-API-Key 头）。请在后端允许跨域并放行 OPTIONS + Access-Control-Allow-Headers: X-API-Key。";
            setHealth({ state: "fail", message: msg });
            const sig = `${realBase}|cors|${apiKey}`;
            if (sig !== lastFailRef.current) {
              lastFailRef.current = sig;
              onToast({ type: "error", title: "健康检查失败", message: msg });
            }
            return;
          }
        }

        setHealth({ state: "ok", message: apiKey ? "连接正常（已校验 Key）" : "连接正常（未校验 Key）" });
      } catch (e) {
        const msg = e?.message || "网络错误";
        setHealth({ state: "fail", message: msg });
        const sig = `${raw}|${apiKey}|${msg}`;
        if (sig !== lastFailRef.current) {
          lastFailRef.current = sig;
          onToast({ type: "error", title: "健康检查失败", message: msg });
        }
      }
    }, 700);

    return () => window.clearTimeout(timerRef.current);
  }, [baseUrl, apiKey, useMock, onToast]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-semibold tracking-tight">设置</div>
          <div className="mt-2 text-sm text-black/55">配置 API Key / Base URL；修改后会自动做健康检查。</div>
        </div>
        <div className="flex items-center gap-2">
          {useMock ? (
            <Badge tone="gray">Mock 模式</Badge>
          ) : health.state === "checking" ? (
            <Badge tone="yellow">检查中…</Badge>
          ) : health.state === "ok" ? (
            <Badge tone="green">健康：OK</Badge>
          ) : health.state === "fail" ? (
            <Badge tone="red">健康：失败</Badge>
          ) : (
            <Badge tone="gray">健康：未检查</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader
          title="连接设置"
          subtitle="所有请求均会带 X-API-Key；如你使用统一交付入口，也可选择在部署环境注入 Key。"
          right={
            !useMock && health.state === "fail" ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Activity className="h-4.5 w-4.5 text-red-600" />
                <div className="max-w-[320px] text-xs text-red-700 truncate">{health.message || "连接异常"}</div>
              </div>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-[#fafafa] p-4">
            <div>
              <div className="text-sm font-semibold">Mock 模式</div>
              <div className="mt-1 text-sm text-black/55">开启后不调用真实后端，自动模拟上传 / 轮询 / 下载。</div>
            </div>
            <button
              onClick={() => setUseMock((v) => !v)}
              className={cx(
                "relative h-8 w-14 rounded-full border border-black/15 transition",
                useMock ? "bg-black" : "bg-white"
              )}
              aria-label="toggle mock"
            >
              <span
                className={cx(
                  "absolute top-1 h-6 w-6 rounded-full shadow-sm transition",
                  useMock ? "left-7 bg-white" : "left-1 bg-black"
                )}
              />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">Base URL</div>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://fwwb.sjbsjb.xyz"
              />
              <div className="mt-2 text-xs text-black/45">会自动拼接 <span className="font-mono">/api/v1</span> 前缀。</div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">X-API-Key</div>
                <Button variant="ghost" size="sm" onClick={() => setMasked((m) => !m)}>
                  {masked ? "显示" : "隐藏"}
                </Button>
              </div>
              <Input
                type={masked ? "password" : "text"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入你的 API Key（若走方案 B）"
              />
              <div className="mt-2 text-xs text-black/45">存储在 localStorage（可一键清除）。</div>
            </div>
          </div>

          {!useMock && health.state === "fail" ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 whitespace-normal break-words leading-snug">
              健康检查失败：{health.message || "连接异常"}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setApiKey("");
                onToast({ type: "success", title: "已清除 API Key" });
              }}
            >
              清除 Key
            </Button>
            <Button variant="secondary" onClick={onClearJobs}>清空任务缓存</Button>
            <Button
              onClick={() =>
                onToast({
                  type: "success",
                  title: "设置已保存",
                  message: useMock ? "当前为 Mock 模式" : "将使用真实后端（已自动健康检查）",
                })
              }
            >
              保存
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="安全提示" subtitle="如果对外开放可配置 Key，请明确告知风险；更推荐部署时注入 Key（方案 A）。" />
        <CardBody>
          <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4 text-sm text-black/65">
            <ul className="list-disc pl-5">
              <li>不要把 API Key 写入公开仓库；不要在控制台打印 Key。</li>
              <li>如需对外用户自填 Key，可提供“一键清除 Key”。</li>
              <li>后端建议配合 CORS、限流与 Key 轮换策略。</li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// -----------------------------
// Quick Create (4-step)
// -----------------------------
function QuickCreatePage({ client, jobs, setJobs, useMock, apiKey, onToast, onNavigate }) {
  const [step, setStep] = useState(1);

  // Step1
  const [sourceFiles, setSourceFiles] = useState([]);
  const [docsetId, setDocsetId] = useState(null);
  const [uploadingDocset, setUploadingDocset] = useState(false);

  // Step2
  const [templateFile, setTemplateFile] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Step3
  const defaultInstruction = "请读取文档集并自动填写模板。只输出最终填好的文件，不要输出中间过程。";
  const [instruction, setInstruction] = useState(defaultInstruction);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openaiModel, setOpenaiModel] = useState("chatgpt5.2-thinking");
  const [reasoningEffort, setReasoningEffort] = useState("high");
  const [memoryLimit, setMemoryLimit] = useState("4g");
  const [mode, setMode] = useState("async");
  const [creatingJob, setCreatingJob] = useState(false);

  // Step4
  const [activeJobId, setActiveJobId] = useState(null);

  const steps = [
    { n: 1, title: "上传资料包", desc: "doc / docx / md / txt / xls / xlsx（最多 8 个）" },
    { n: 2, title: "上传模板", desc: "doc / docx / xls / xlsx（单文件）" },
    { n: 3, title: "高级设置", desc: "默认推荐；可选展开" },
    { n: 4, title: "生成与下载", desc: "轮询状态 + 结果下载" },
  ];

  const currentJob = useMemo(() => jobs.find((j) => j.job_id === activeJobId), [jobs, activeJobId]);

  useJobPolling({
    client,
    jobId: activeJobId,
    enabled: Boolean(activeJobId) && ["queued", "running"].includes(currentJob?.status),
    onUpdate: (data) => {
      setJobs((prev) => upsertJob({ job_id: activeJobId, ...data }, prev));
    },
  });

  const running = currentJob && ["queued", "running"].includes(currentJob.status);
  const succeeded = currentJob?.status === "succeeded";
  const failed = currentJob?.status === "failed";
  const progress = useFakeProgress({ running, succeeded, failed });

  function validateSourceFiles(files) {
    const exts = [".doc", ".docx", ".xls", ".xlsx", ".md", ".txt"]; 
    const ok = [];
    const bad = [];
    for (const f of files) {
      const lower = f.name.toLowerCase();
      const extOk = exts.some((e) => lower.endsWith(e));
      (extOk ? ok : bad).push(f);
    }
    return { ok, bad };
  }

  function validateTemplateFile(file) {
    const exts = [".doc", ".docx", ".xls", ".xlsx"];
    const lower = file.name.toLowerCase();
    return exts.some((e) => lower.endsWith(e));
  }

  async function handleUploadDocset() {
    if (sourceFiles.length === 0) return;
    if (!useMock && !apiKey) {
      onToast({ type: "error", title: "缺少 API Key", message: "请先在 设置 页面配置 X-API-Key，或开启 Mock 模式。" });
      return;
    }

    try {
      setUploadingDocset(true);
      const res = await client.createDocset({ files: sourceFiles, name: "比赛测试文档样本集" });
      const id = res.docset_id;
      setDocsetId(id);
      onToast({ type: "success", title: "资料包上传成功", message: `docset_id：${id}` });
      setStep(2);
    } catch (e) {
      onToast({ type: "error", title: "资料包上传失败", message: e.message });
    } finally {
      setUploadingDocset(false);
    }
  }

  async function handleUploadTemplate() {
    if (!templateFile) return;
    if (!useMock && !apiKey) {
      onToast({ type: "error", title: "缺少 API Key", message: "请先在 设置 页面配置 X-API-Key，或开启 Mock 模式。" });
      return;
    }

    try {
      setUploadingTemplate(true);
      const res = await client.uploadTemplate({ file: templateFile, name: templateFile.name });
      const id = res.template_id;
      setTemplateId(id);
      onToast({ type: "success", title: "模板上传成功", message: `template_id：${id}` });
      setStep(3);
    } catch (e) {
      onToast({ type: "error", title: "模板上传失败", message: e.message });
    } finally {
      setUploadingTemplate(false);
    }
  }

  async function handleStartJob() {
    if (!useMock && !apiKey) {
      onToast({ type: "error", title: "缺少 API Key", message: "请先在 设置 页面配置 X-API-Key，或开启 Mock 模式。" });
      return;
    }

    if (creatingJob) return;

    const payload = {
      docset_id: docsetId,
      template_id: templateId,
      mode,
      openai: {
        model: openaiModel,
        reasoning_effort: reasoningEffort,
        memory_limit: memoryLimit,
      },
      instruction: instruction || defaultInstruction,
    };

    setCreatingJob(true);

    try {
      const res = await client.createFillJob(payload);
      const job_id = res.job_id;
      setActiveJobId(job_id);

      const jobRecord = {
        job_id,
        status: res.status || "queued",
        stage: "queued",
        local_created_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now(),
        docset_id: docsetId,
        template_id: templateId,
        template_file: templateFile ? { name: templateFile.name, size: templateFile.size } : null,
        source_files: sourceFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        instruction: (instruction || "").slice(0, 200),
        openai_model: openaiModel,
        last_request: payload,
        last_response: null,
        outputs: [],
        error: null,
      };

      setJobs((prev) => upsertJob(jobRecord, prev));
      setStep(4);
      onToast({ type: "success", title: "任务已创建", message: `job_id：${job_id}` });
    } catch (e) {
      onToast({ type: "error", title: "创建任务失败", message: e.message });
    } finally {
      setCreatingJob(false);
    }
  }

  function addFiles(files) {
    const { ok, bad } = validateSourceFiles(files);
    if (bad.length) {
      onToast({ type: "error", title: "不支持的文件类型", message: `已拒绝：${bad.map((b) => b.name).join(", ")}` });
    }

    setSourceFiles((prev) => {
      const next = [...prev];
      for (const f of ok) {
        if (next.length >= 8) {
          onToast({ type: "error", title: "最多只能上传 8 个文件" });
          break;
        }
        next.push(f);
      }
      return next;
    });
  }

  function removeSource(name) {
    setSourceFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function setTemplate(file) {
    if (!validateTemplateFile(file)) {
      onToast({ type: "error", title: "模板类型不支持", message: "仅支持 .doc / .docx / .xls / .xlsx" });
      return;
    }
    if (templateFile) {
      const ok = window.confirm("替换当前模板？");
      if (!ok) return;
    }
    setTemplateFile(file);
  }

  useEffect(() => {
    if (!activeJobId) return;
    if (!currentJob) return;
    setJobs((prev) =>
      upsertJob(
        {
          job_id: activeJobId,
          status: currentJob.status,
          stage: currentJob.stage,
          outputs: currentJob.outputs,
          error: currentJob.error,
          last_response: {
            job_id: currentJob.job_id,
            status: currentJob.status,
            stage: currentJob.stage,
            outputs: currentJob.outputs,
            error: currentJob.error,
          },
        },
        prev
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJob?.status, currentJob?.stage]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-3xl font-semibold tracking-tight">快速新建</div>
          <div className="mt-2 text-sm text-black/55 whitespace-normal break-words leading-snug">上传文档 → 上传模板 →（可选）高级设置 → 生成并下载</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="gray">{useMock ? "Mock" : "Real"}</Badge>
          <Badge tone={apiKey || useMock ? "green" : "red"}>{apiKey || useMock ? "可运行" : "需配置 Key"}</Badge>
        </div>
      </div>

      <Card>
        <CardBody>
          <Stepper steps={steps} current={step} />
        </CardBody>
      </Card>

      {step === 1 ? (
        <Step1UploadDocset files={sourceFiles} onAddFiles={addFiles} onRemove={removeSource} onNext={handleUploadDocset} loading={uploadingDocset} />
      ) : null}

      {step === 2 ? (
        <Step2UploadTemplate file={templateFile} onPickFile={setTemplate} onNext={handleUploadTemplate} loading={uploadingTemplate} onBack={() => setStep(1)} />
      ) : null}

      {step === 3 ? (
        <Step3Advanced
          instruction={instruction}
          setInstruction={setInstruction}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          openaiModel={openaiModel}
          setOpenaiModel={setOpenaiModel}
          reasoningEffort={reasoningEffort}
          setReasoningEffort={setReasoningEffort}
          memoryLimit={memoryLimit}
          setMemoryLimit={setMemoryLimit}
          mode={mode}
          setMode={setMode}
          onStart={handleStartJob}
          startLoading={creatingJob}
          onBack={() => setStep(2)}
        />
      ) : null}

      {step === 4 ? (
        <Step4Job
          client={client}
          job={currentJob}
          progress={progress}
          headerTitle="Step 4 · 任务运行详情"
          headerSubtitle="展示状态、假进度条、输入摘要与下载/重试"
          headerRight={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setStep(3)}>
                <ChevronLeft className="h-4.5 w-4.5" />
                上一步
              </Button>
              {currentJob?.job_id ? (
                <Button variant="secondary" onClick={() => onNavigate(`/jobs/${currentJob.job_id}`)}>
                  <ExternalLink className="h-4.5 w-4.5" />
                  打开详情
                </Button>
              ) : null}
            </div>
          }
          onToast={onToast}
          onRetry={() => handleStartJob()}
        />
      ) : null}

      <Card>
        <CardHeader title="提示" subtitle="刷新/关闭页面可能导致中断；本应用会把 job_id 与摘要持久化在 localStorage，刷新后可恢复轮询。" />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4 text-sm text-black/65">
              <div className="font-semibold text-black">强推荐</div>
              <ul className="mt-2 list-disc pl-5">
                <li>默认用 async：避免浏览器超时/断网导致结果丢失</li>
                <li>任务列表可查看全部状态并下载成功结果</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4 text-sm text-black/65">
              <div className="font-semibold text-black">调试</div>
              <ul className="mt-2 list-disc pl-5">
                <li>Mock 模式：无需配置 Key，也能预览全流程</li>
                <li>真实模式：请先去 设置 输入 X-API-Key</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Stepper({ steps, current }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((s) => {
        const active = s.n === current;
        const done = s.n < current;
        return (
          <div
            key={s.n}
            className={cx(
              "rounded-2xl border p-4 transition",
              active ? "border-black/25 bg-black/[0.02]" : "border-black/10 bg-white"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cx(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold",
                    done ? "bg-black text-white" : active ? "bg-black text-white" : "bg-black/[0.06] text-black"
                  )}
                >
                  {done ? <CheckCircle2 className="h-4.5 w-4.5" /> : s.n}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-snug whitespace-normal break-words">{s.title}</div>
                  <div className="mt-0.5 text-xs text-black/45 leading-snug whitespace-normal break-words">{s.desc}</div>
                </div>
              </div>
              <div className="shrink-0">
                {active ? <Badge tone="blue">当前</Badge> : done ? <Badge tone="green">完成</Badge> : <Badge tone="gray">待做</Badge>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Dropzone({ multiple, onFiles, acceptHint, maxHint }) {
  const inputRef = useRef(null);
  return (
    <div
      className="rounded-2xl border border-dashed border-black/15 bg-[#fafafa] p-8 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length) onFiles(files);
      }}
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-black text-white">
        <Upload className="h-5 w-5" />
      </div>
      <div className="mt-4 text-sm font-semibold">拖拽文件到这里</div>
      <div className="mt-1 text-sm text-black/55">或点击选择文件</div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-black/45">
        <span>{acceptHint}</span>
        {maxHint ? (
          <>
            <span>·</span>
            <span>{maxHint}</span>
          </>
        ) : null}
      </div>
      <div className="mt-5">
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          选择文件
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) onFiles(files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function Step1UploadDocset({ files, onAddFiles, onRemove, onNext, loading }) {
  return (
    <Card>
      <CardHeader
        title="Step 1 · 上传非结构化文档"
        subtitle="支持 doc / docx / md / txt / xls / xlsx，多文件上传（最多 8 个）"
        right={
          <Button onClick={onNext} disabled={files.length === 0 || loading}>
            {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : null}
            继续
          </Button>
        }
      />
      <CardBody>
        <Dropzone multiple onFiles={onAddFiles} acceptHint="doc / docx / md / txt / xls / xlsx" maxHint="最多 8 个文件" />

        <Divider />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">已选择文件（{files.length}/8）</div>
          <div className="text-xs text-black/45">点击右侧 × 删除</div>
        </div>

        {files.length ? (
          <div className="mt-3 space-y-2">
            {files.map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{f.name}</div>
                  <div className="mt-1 text-xs text-black/45">{formatBytes(f.size)}</div>
                </div>
                <button className="rounded-xl p-2 hover:bg-black/[0.04]" onClick={() => onRemove(f.name)} aria-label="remove">
                  <XCircle className="h-5 w-5 text-black/40" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/55">请选择至少 1 个文件后继续。</div>
        )}
      </CardBody>
    </Card>
  );
}

function Step2UploadTemplate({ file, onPickFile, onNext, loading, onBack }) {
  return (
    <Card>
      <CardHeader
        title="Step 2 · 上传模板（单文件）"
        subtitle="仅支持 .doc / .docx / .xls / .xlsx；再次上传会覆盖"
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onBack} disabled={loading}>
              <ChevronLeft className="h-4.5 w-4.5" />
              上一步
            </Button>
            <Button onClick={onNext} disabled={!file || loading}>
              {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : null}
              继续
            </Button>
          </div>
        }
      />
      <CardBody>
        <Dropzone multiple={false} onFiles={(files) => files[0] && onPickFile(files[0])} acceptHint="doc / docx / xls / xlsx" />

        <Divider />

        <div className="text-sm font-semibold">当前模板</div>
        {file ? (
          <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{file.name}</div>
                <div className="mt-1 text-xs text-black/45">{formatBytes(file.size)}</div>
              </div>
              <Badge tone="blue">已选择</Badge>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/55">请选择模板后继续。</div>
        )}
      </CardBody>
    </Card>
  );
}

function Step3Advanced({
  instruction,
  setInstruction,
  showAdvanced,
  setShowAdvanced,
  openaiModel,
  setOpenaiModel,
  reasoningEffort,
  setReasoningEffort,
  memoryLimit,
  setMemoryLimit,
  mode,
  setMode,
  onStart,
  startLoading,
  onBack,
}) {
  const modelOptions = [
    { value: "chatgpt5.2-thinking", label: "chatgpt5.2-thinking（示例默认）" },
    { value: "gpt-4o", label: "gpt-4o" },
    { value: "gpt-4o-mini", label: "gpt-4o-mini" },
    { value: "gpt-4.1", label: "gpt-4.1" },
    { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
    { value: "o3-mini", label: "o3-mini" },
    { value: "o1-mini", label: "o1-mini" },
  ];

  return (
    <Card>
      <CardHeader
        title="Step 3 · 高级选项（默认推荐）"
        subtitle="大多数情况无需调整；Prompt 文本框默认展开"
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onBack}>
              <ChevronLeft className="h-4.5 w-4.5" />
              上一步
            </Button>
            <Button onClick={onStart} disabled={startLoading}>
              {startLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Wand2 className="h-4.5 w-4.5" />}
              开始生成
            </Button>
          </div>
        }
      />
      <CardBody>
        <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4 text-sm text-black/65">
          <div className="font-semibold text-black">推荐使用默认设置</div>
          <div className="mt-1">如果你不确定怎么写 Prompt，就用默认值即可。</div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold">业务指令 / Prompt</div>
          <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} />
          <div className="mt-2 text-xs text-black/45">提示：可在这里指定“缺失字段如何处理 / 只填某些列 / 不输出中间过程”等。</div>
        </div>

        <Divider />

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white p-4 hover:bg-black/[0.02]"
        >
          <div className="text-left min-w-0">
            <div className="text-sm font-semibold">高级设置</div>
            <div className="mt-1 text-sm text-black/55 whitespace-normal break-words leading-snug">model / mode / reasoning_effort / memory_limit 等（默认收起）</div>
          </div>
          <Badge tone="gray">{showAdvanced ? "收起" : "展开"}</Badge>
        </button>

        {showAdvanced ? (
          <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="mb-2 text-sm font-medium">openai.model</div>
              <select
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                className="h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-black/35"
              >
                {modelOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-black/45">只需传字符串给后端；是否生效取决于你们后端实现。</div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">mode</div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-black/35"
              >
                <option value="async">async（推荐）</option>
                <option value="sync">sync</option>
              </select>
              <div className="mt-2 text-xs text-black/45">建议保持 async，前端轮询更稳。</div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">reasoning_effort</div>
              <select
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value)}
                className="h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-black/35"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high（默认）</option>
              </select>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">memory_limit</div>
              <select
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(e.target.value)}
                className="h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-black/35"
              >
                <option value="1g">1g</option>
                <option value="4g">4g（默认）</option>
                <option value="16g">16g</option>
                <option value="64g">64g</option>
              </select>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Step4Job({ client, job, progress, headerTitle, headerSubtitle, headerRight, onToast, onRetry }) {
  const isRunning = job && ["queued", "running"].includes(job.status);
  const isSucceeded = job?.status === "succeeded";
  const isFailed = job?.status === "failed";

  async function handleDownload() {
    if (!job?.job_id) return;
    if (!job.outputs?.length) {
      onToast({ type: "error", title: "没有可下载的输出" });
      return;
    }
    try {
      const blob = await client.downloadFile({ job_id: job.job_id, index: 0 });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = job.outputs[0].filename || `filled_${job.job_id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onToast({ type: "success", title: "开始下载" });
    } catch (e) {
      onToast({ type: "error", title: "下载失败", message: e.message });
    }
  }

  return (
    <Card>
      <CardHeader title={headerTitle} subtitle={headerSubtitle} right={headerRight} />
      <CardBody>
        {!job ? (
          <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-6 text-sm text-black/55">任务尚未创建。请返回上一步点击“开始生成”。</div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">状态总览</div>
                      <div className="mt-1 text-xs text-black/45 whitespace-normal break-words">job_id：<span className="font-mono">{job.job_id}</span></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={job.status} />
                      {job.stage ? <Badge tone="gray">stage：{job.stage}</Badge> : null}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-black/55">
                      <span>{isRunning ? "处理中…" : isSucceeded ? "已完成" : isFailed ? "失败" : ""}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <ProgressBar value={progress} />
                    <div className="mt-2 text-xs text-black/45 leading-snug whitespace-normal break-words">
                      {isRunning && progress >= 99 ? "即将完成，请稍候…" : ""}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isSucceeded ? (
                      <Button onClick={handleDownload}>
                        <Download className="h-4.5 w-4.5" />
                        下载文件
                      </Button>
                    ) : null}
                    {isFailed ? (
                      <Button onClick={onRetry}>
                        <RefreshCw className="h-4.5 w-4.5" />
                        重试（新建任务）
                      </Button>
                    ) : null}
                    {isRunning ? (
                      <Button variant="secondary" disabled>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        运行中
                      </Button>
                    ) : null}
                  </div>

                  {isFailed ? (
                    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-red-700 whitespace-normal break-words">{job.error?.message || "任务失败"}</div>
                          <div className="mt-1 text-sm text-red-700/70">code：{job.error?.code || "UNKNOWN"}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                  <div className="text-sm font-semibold">输入摘要</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
                      <div className="text-xs text-black/45">模板</div>
                      <div className="mt-1 text-sm font-semibold whitespace-normal break-words">{job.template_file?.name || "-"}</div>
                      <div className="mt-1 text-xs text-black/45">{job.template_file ? formatBytes(job.template_file.size) : ""}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
                      <div className="text-xs text-black/45">文档集</div>
                      <div className="mt-1 text-sm font-semibold">{job.source_files?.length || 0} 个文件</div>
                      <div className="mt-1 text-xs text-black/45 whitespace-normal break-words">docset_id：<span className="font-mono">{job.docset_id}</span></div>
                    </div>
                  </div>

                  {job.source_files?.length ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-black/65 hover:text-black">展开查看文件列表</summary>
                      <div className="mt-3 space-y-2">
                        {job.source_files.map((f) => (
                          <div key={f.name} className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{f.name}</div>
                              <div className="mt-1 text-xs text-black/45">{formatBytes(f.size)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="text-sm font-semibold">高级信息（折叠）</div>
                  <div className="mt-3 space-y-3">
                    <Collapsible
                      title="IDs"
                      content={
                        <div className="space-y-2 text-sm">
                          <Row label="job_id" value={job.job_id} mono />
                          <Row label="docset_id" value={job.docset_id} mono />
                          <Row label="template_id" value={job.template_id} mono />
                        </div>
                      }
                    />
                    <Collapsible title="请求体（可复制）" content={<JsonBox value={job.last_request} />} />
                    <Collapsible title="最新轮询响应（可复制）" content={<JsonBox value={job.last_response || { note: "等待轮询返回…" }} />} />
                  </div>
                </div>

                {isSucceeded ? (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-emerald-800">生成成功</div>
                        <div className="mt-1 text-sm text-emerald-800/70 whitespace-normal break-words">{job.outputs?.[0]?.filename ? `输出：${job.outputs[0].filename}` : ""}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3 py-2">
      <div className="text-xs text-black/50">{label}</div>
      <div className={cx("text-xs text-black/80", mono ? "font-mono" : "")}>{value || "-"}</div>
    </div>
  );
}

function Collapsible({ title, content }) {
  return (
    <details className="rounded-2xl border border-black/10 bg-[#fafafa] p-3">
      <summary className="cursor-pointer text-sm font-semibold text-black/80">{title}</summary>
      <div className="mt-3">{content}</div>
    </details>
  );
}

function JsonBox({ value }) {
  const text = useMemo(() => JSON.stringify(value ?? null, null, 2), [value]);
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-black/45">JSON</div>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch {
              // ignore
            }
          }}
        >
          <Copy className="h-4 w-4" />
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <pre className="max-h-[240px] overflow-auto rounded-xl bg-black/[0.03] p-3 text-xs leading-relaxed text-black/75">{text}</pre>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    queued: { tone: "yellow", label: "queued" },
    running: { tone: "blue", label: "running" },
    succeeded: { tone: "green", label: "succeeded" },
    failed: { tone: "red", label: "failed" },
    canceled: { tone: "gray", label: "canceled" },
  };
  const s = map[status] || { tone: "gray", label: status || "unknown" };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

// -----------------------------
// Jobs list
// -----------------------------
function JobsPage({ client, jobs, setJobs, onToast, onNavigate }) {
  const getFilterFromHash = () => {
    const raw = (window.location.hash || "").replace(/^#/, "");
    const idx = raw.indexOf("?");
    if (idx === -1) return "all";
    const qs = raw.slice(idx + 1);
    const sp = new URLSearchParams(qs);
    return sp.get("filter") || "all";
  };

  const [filter, setFilter] = useState(() => getFilterFromHash());

  useEffect(() => {
    const onHash = () => {
      const f = getFilterFromHash();
      setFilter((prev) => (prev === f ? prev : f));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setFilterAndUrl = (v) => {
    setFilter(v);
    const path = v && v !== "all" ? `/jobs?filter=${encodeURIComponent(v)}` : "/jobs";
    window.location.hash = path;
  };


  const filtered = useMemo(() => {
    const arr = [...jobs];
    arr.sort((a, b) => (b.created_at || b.local_created_at || 0) - (a.created_at || a.local_created_at || 0));
    if (filter === "all") return arr;
    if (filter === "running") return arr.filter((j) => ["queued", "running"].includes(j.status));
    if (filter === "succeeded") return arr.filter((j) => j.status === "succeeded");
    if (filter === "failed") return arr.filter((j) => j.status === "failed");
    return arr;
  }, [jobs, filter]);

  async function download(job) {
    try {
      if (!job.outputs?.length) throw new Error("该任务没有输出文件");
      const blob = await client.downloadFile({ job_id: job.job_id, index: 0 });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = job.outputs[0].filename || `filled_${job.job_id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onToast({ type: "success", title: "开始下载" });
    } catch (e) {
      onToast({ type: "error", title: "下载失败", message: e.message });
    }
  }

  async function refreshOne(jobId) {
    try {
      const data = await client.getJob(jobId);
      setJobs((prev) => upsertJob({ job_id: jobId, ...data }, prev));
      onToast({ type: "success", title: "已刷新状态" });
    } catch (e) {
      onToast({ type: "error", title: "刷新失败", message: e.message });
    }
  }

  async function retry(job) {
    try {
      if (!job.docset_id || !job.template_id) throw new Error("缺少 docset_id/template_id");
      const payload = {
        docset_id: job.docset_id,
        template_id: job.template_id,
        mode: "async",
        openai: {
          model: job.openai_model || "chatgpt5.2-thinking",
          reasoning_effort: "high",
          memory_limit: "4g",
        },
        instruction: job.instruction || "请读取文档集并自动填写模板。只输出最终填好的文件，不要输出中间过程。",
      };
      const res = await client.createFillJob(payload);
      const job_id = res.job_id;

      const newRec = {
        job_id,
        status: res.status || "queued",
        stage: "queued",
        local_created_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now(),
        docset_id: job.docset_id,
        template_id: job.template_id,
        template_file: job.template_file,
        source_files: job.source_files,
        instruction: (payload.instruction || "").slice(0, 200),
        openai_model: payload.openai.model,
        last_request: payload,
        last_response: null,
        outputs: [],
        error: null,
      };
      setJobs((prev) => upsertJob(newRec, prev));
      onToast({ type: "success", title: "已创建新任务", message: `job_id：${job_id}` });
      onNavigate(`/jobs/${job_id}`);
    } catch (e) {
      onToast({ type: "error", title: "重试失败", message: e.message });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-3xl font-semibold tracking-tight">任务列表</div>
          <div className="mt-2 text-sm text-black/55 whitespace-normal break-words leading-snug">全部任务来自本地持久化（localStorage），状态以轮询结果为准。</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilterAndUrl("all")}>全部</Button>
          <Button size="sm" variant={filter === "running" ? "primary" : "secondary"} onClick={() => setFilterAndUrl("running")}>运行中</Button>
          <Button size="sm" variant={filter === "succeeded" ? "primary" : "secondary"} onClick={() => setFilterAndUrl("succeeded")}>已成功</Button>
          <Button size="sm" variant={filter === "failed" ? "primary" : "secondary"} onClick={() => setFilterAndUrl("failed")}>已失败</Button>
        </div>
      </div>

      <Card>
        <CardHeader title={`任务（${filtered.length}）`} subtitle="默认按创建时间倒序" right={<Button variant="secondary" onClick={() => onNavigate("/quick-create")}>+ 新建</Button>} />
        <CardBody>
          {filtered.length ? (
            <div className="space-y-3">
              {filtered.map((j) => (
                <div key={j.job_id} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{j.template_file?.name || "未命名模板"}</div>
                      <div className="mt-1 text-xs text-black/45 whitespace-normal break-words">
                        {formatTime(j.created_at || j.local_created_at || Date.now())} · 文档 {j.source_files?.length || 0} 个
                      </div>
                      <div className="mt-1 text-xs text-black/45 whitespace-normal break-words">job_id：<span className="font-mono">{j.job_id}</span></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={j.status} />
                      {j.stage ? <Badge tone="gray">{j.stage}</Badge> : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => onNavigate(`/jobs/${j.job_id}`)}>查看详情</Button>
                    <Button variant="secondary" onClick={() => refreshOne(j.job_id)}>
                      <RefreshCw className="h-4.5 w-4.5" />
                      刷新
                    </Button>
                    {j.status === "succeeded" ? (
                      <Button onClick={() => download(j)}>
                        <Download className="h-4.5 w-4.5" />
                        下载
                      </Button>
                    ) : null}
                    {j.status === "failed" ? (
                      <Button onClick={() => retry(j)}>
                        <RefreshCw className="h-4.5 w-4.5" />
                        重试
                      </Button>
                    ) : null}
                  </div>

                  {j.status === "failed" ? (
                    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-700 whitespace-normal break-words">
                      {j.error?.message || "任务失败"}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-black/15 bg-[#fafafa] p-12 text-center">
              <div className="text-sm font-semibold">暂无任务</div>
              <div className="mt-1 text-sm text-black/55">点击右上角“+ 新建”或去“快速新建”。</div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// -----------------------------
// Job detail page (NO "Step 4" label)
// -----------------------------
function JobDetailPage({ client, jobs, setJobs, jobId, onToast, onNavigate }) {
  const job = useMemo(() => jobs.find((j) => j.job_id === jobId), [jobs, jobId]);

  useEffect(() => {
    if (job) return;
    (async () => {
      try {
        const data = await client.getJob(jobId);
        setJobs((prev) => upsertJob({ job_id: jobId, ...data, created_at: data.created_at || Date.now() }, prev));
      } catch (e) {
        onToast({ type: "error", title: "无法获取任务", message: e.message });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useJobPolling({
    client,
    jobId,
    enabled: Boolean(jobId) && ["queued", "running"].includes(job?.status),
    onUpdate: (data) => setJobs((prev) => upsertJob({ job_id: jobId, ...data }, prev)),
  });

  const running = job && ["queued", "running"].includes(job.status);
  const succeeded = job?.status === "succeeded";
  const failed = job?.status === "failed";
  const progress = useFakeProgress({ running, succeeded, failed });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-3xl font-semibold tracking-tight">任务详情</div>
          <div className="mt-2 text-sm text-black/55 whitespace-normal break-words">/jobs/{jobId}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => onNavigate("/jobs")}>
            <ChevronLeft className="h-4.5 w-4.5" />
            返回列表
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const data = await client.getJob(jobId);
                setJobs((prev) => upsertJob({ job_id: jobId, ...data }, prev));
                onToast({ type: "success", title: "已刷新" });
              } catch (e) {
                onToast({ type: "error", title: "刷新失败", message: e.message });
              }
            }}
          >
            <RefreshCw className="h-4.5 w-4.5" />
            刷新
          </Button>
        </div>
      </div>

      <Step4Job
        client={client}
        job={job}
        progress={progress}
        headerTitle="任务运行详情"
        headerSubtitle="状态、进度、输入摘要与下载/重试"
        headerRight={null}
        onToast={onToast}
        onRetry={async () => {
          try {
            if (!job?.docset_id || !job?.template_id) throw new Error("缺少 docset_id/template_id");
            const payload = {
              docset_id: job.docset_id,
              template_id: job.template_id,
              mode: "async",
              openai: {
                model: job.openai_model || "chatgpt5.2-thinking",
                reasoning_effort: "high",
                memory_limit: "4g",
              },
              instruction: job.instruction || "请读取文档集并自动填写模板。只输出最终填好的文件，不要输出中间过程。",
            };
            const res = await client.createFillJob(payload);
            const newId = res.job_id;
            setJobs((prev) =>
              upsertJob(
                {
                  job_id: newId,
                  status: res.status || "queued",
                  stage: "queued",
                  local_created_at: Date.now(),
                  created_at: Date.now(),
                  updated_at: Date.now(),
                  docset_id: job.docset_id,
                  template_id: job.template_id,
                  template_file: job.template_file,
                  source_files: job.source_files,
                  instruction: (payload.instruction || "").slice(0, 200),
                  openai_model: payload.openai.model,
                  last_request: payload,
                  last_response: null,
                  outputs: [],
                  error: null,
                },
                prev
              )
            );
            onToast({ type: "success", title: "已创建新任务", message: `job_id：${newId}` });
            onNavigate(`/jobs/${newId}`);
          } catch (e) {
            onToast({ type: "error", title: "重试失败", message: e.message });
          }
        }}
      />
    </div>
  );
}
