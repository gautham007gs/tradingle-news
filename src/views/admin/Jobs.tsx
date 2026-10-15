import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Briefcase, ExternalLink, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { hostingerApi } from "@/lib/hostingerApi";

// ── Types ──────────────────────────────────────────────────────────────────
type JobType = "full-time" | "part-time" | "contract" | "internship";
type WorkMode = "remote" | "hybrid" | "onsite";
type JobStatus = "active" | "draft" | "closed";

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  job_type: JobType;
  work_mode: WorkMode;
  description: string;
  requirements: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  apply_url: string;
  apply_email: string;
  posted_at: string;
  expires_at: string | null;
  status: JobStatus;
}

const makeEmptyJob = (): Omit<Job, "id"> => ({
  title: "",
  department: "",
  location: "New Delhi, India",
  job_type: "full-time",
  work_mode: "hybrid",
  description: "",
  requirements: "",
  salary_min: null,
  salary_max: null,
  salary_currency: "INR",
  apply_url: "",
  apply_email: "careers@tradingle.com",
  posted_at: new Date().toISOString().slice(0, 16),
  expires_at: null,
  status: "draft",
});

const DEPARTMENTS = ["Editorial", "Engineering", "Product & Design", "Sales & Partnerships", "Operations", "Internships", "Other"];
const STATUS_COLORS: Record<JobStatus, string> = {
  active: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
};
const JOB_TYPES: JobType[] = ["full-time", "part-time", "contract", "internship"];
const WORK_MODES: WorkMode[] = ["remote", "hybrid", "onsite"];

// ── API helpers ────────────────────────────────────────────────────────────
// Every write goes through hostingerApi so it carries the X-CSRF-Token header
// (and the Bearer session token when one is held). api/admin/jobs.php calls
// require_csrf_token() for POST/PUT/DELETE, so a bare fetch() — which is what
// this view used to do — was rejected with 400 "CSRF token required."
const jobsApi = {
  list: () => hostingerApi.adminJobs() as Promise<{ data: Job[] }>,
  create: (data: Omit<Job, "id">) => hostingerApi.createJob(data as unknown as Record<string, unknown>),
  update: (id: number, data: Omit<Job, "id">) =>
    hostingerApi.updateJob(id, data as unknown as Record<string, unknown>),
  delete: (id: number) => hostingerApi.deleteJob(id),
  createTable: () => hostingerApi.createJobsTable(),
};

// ── Select helper ──────────────────────────────────────────────────────────
function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── Job Form ───────────────────────────────────────────────────────────────
function JobForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Omit<Job, "id"> & { id?: number };
  onSave: (data: Omit<Job, "id">) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  // Normalize DB dates (YYYY-MM-DD HH:mm:ss) to HTML input formats on init
  const normalizeInitial = (d: Omit<Job, "id"> & { id?: number }): Omit<Job, "id"> => ({
    ...d,
    // datetime-local needs YYYY-MM-DDTHH:mm
    posted_at: d.posted_at ? d.posted_at.replace(" ", "T").slice(0, 16) : new Date().toISOString().slice(0, 16),
    // date input needs YYYY-MM-DD
    expires_at: d.expires_at ? d.expires_at.slice(0, 10) : null,
  });
  const [form, setForm] = useState<Omit<Job, "id">>(() => normalizeInitial(initial));
  const set = (k: keyof Omit<Job, "id">, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role basics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="jf-title" className="text-sm font-medium">Job title <span className="text-destructive">*</span></Label>
          <Input id="jf-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Correspondent — Politics" required />
        </div>

        <Select label="Department" value={form.department} onChange={(v) => set("department", v)}
          options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} />

        <div className="space-y-1.5">
          <Label htmlFor="jf-location" className="text-sm font-medium">Location</Label>
          <Input id="jf-location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="New Delhi, India" />
        </div>

        <Select label="Employment type" value={form.job_type} onChange={(v) => set("job_type", v as JobType)}
          options={JOB_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1).replace("-", "-") }))} />

        <Select label="Work mode" value={form.work_mode} onChange={(v) => set("work_mode", v as WorkMode)}
          options={WORK_MODES.map((m) => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))} />
      </div>

      {/* Description & requirements */}
      <div className="space-y-1.5">
        <Label htmlFor="jf-desc" className="text-sm font-medium">Job description <span className="text-destructive">*</span></Label>
        <Textarea id="jf-desc" value={form.description} onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the role, responsibilities, and what success looks like…" rows={6} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jf-req" className="text-sm font-medium">Requirements</Label>
        <Textarea id="jf-req" value={form.requirements} onChange={(e) => set("requirements", e.target.value)}
          placeholder="List required skills, qualifications, experience…" rows={5} />
      </div>

      {/* Compensation */}
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-semibold">Compensation (optional)</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label="Currency" value={form.salary_currency} onChange={(v) => set("salary_currency", v)}
            options={[{ value: "INR", label: "INR (₹)" }, { value: "USD", label: "USD ($)" }, { value: "EUR", label: "EUR (€)" }]} />
          <div className="space-y-1.5">
            <Label htmlFor="jobs-min-salary-yr-1" className="text-sm font-medium">Min salary / yr</Label>
            <Input id="jobs-min-salary-yr-1" type="number" min={0} value={form.salary_min ?? ""} onChange={(e) => set("salary_min", e.target.value === "" ? null : Number(e.target.value))} placeholder="e.g. 600000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobs-max-salary-yr-2" className="text-sm font-medium">Max salary / yr</Label>
            <Input id="jobs-max-salary-yr-2" type="number" min={0} value={form.salary_max ?? ""} onChange={(e) => set("salary_max", e.target.value === "" ? null : Number(e.target.value))} placeholder="e.g. 1200000" />
          </div>
        </div>
      </div>

      {/* Apply */}
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-semibold">How to apply</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="jf-url" className="text-sm font-medium">Application URL (overrides email)</Label>
            <Input id="jf-url" type="url" value={form.apply_url} onChange={(e) => set("apply_url", e.target.value)} placeholder="https://forms.gle/…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jf-email" className="text-sm font-medium">Application email</Label>
            <Input id="jf-email" type="email" value={form.apply_email} onChange={(e) => set("apply_email", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Dates & status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="jf-posted" className="text-sm font-medium">Posted date</Label>
          <Input id="jf-posted" type="datetime-local" value={form.posted_at?.slice(0, 16) ?? ""} onChange={(e) => set("posted_at", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jf-expires" className="text-sm font-medium">Expires (optional)</Label>
          <Input id="jf-expires" type="date" value={form.expires_at ?? ""} onChange={(e) => set("expires_at", e.target.value || null)} />
        </div>
        <Select label="Status" value={form.status} onChange={(v) => set("status", v as JobStatus)}
          options={[{ value: "draft", label: "Draft" }, { value: "active", label: "Active (live)" }, { value: "closed", label: "Closed" }]} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save job posting"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | JobStatus>("all");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await jobsApi.list();
      setJobs(data || []);
    } catch {
      // Table may not exist yet
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSetupTable = async () => {
    try {
      await jobsApi.createTable();
      toast.success("Jobs table is ready. You can now add postings.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create table");
    }
  };

  const handleSave = async (data: Omit<Job, "id">) => {
    setSaving(true);
    try {
      if (editing) {
        await jobsApi.update(editing.id, data);
        toast.success("Job updated");
      } else {
        await jobsApi.create(data);
        toast.success("Job posting created");
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save job posting");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await jobsApi.delete(id);
      toast.success("Job deleted");
      setDeleteId(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete job");
    }
  };

  const handleEdit = (job: Job) => {
    setEditing(job);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getEmptyJob = () => makeEmptyJob();

  const filtered = filterStatus === "all" ? jobs : jobs.filter((j) => j.status === filterStatus);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Job Postings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage open positions shown on the{" "}
            <a href="/careers" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-1">
              Careers page <ExternalLink size={11} />
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline ml-1.5">Refresh</span>
          </Button>
          <Button size="sm" onClick={handleNew} disabled={showForm}>
            <Plus size={15} />
            <span className="ml-1.5">New posting</span>
          </Button>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mb-8 rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-5">
            {editing ? `Edit: ${editing.title}` : "New job posting"}
          </h2>
          <JobForm
            initial={editing ? { ...editing } : getEmptyJob()}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={saving}
          />
        </div>
      )}

      {/* Filter bar */}
      {!showForm && jobs.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {(["all", "active", "draft", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {" "}
              <span className="opacity-70">
                ({s === "all" ? jobs.length : jobs.filter((j) => j.status === s).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Jobs list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">No job postings yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first posting and it will appear live on the Careers page.
          </p>
          <Button size="sm" variant="outline" onClick={handleSetupTable} className="mr-2">
            Initialize DB table
          </Button>
          <Button size="sm" onClick={handleNew}>Add first posting</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div key={job.id} className="rounded-lg border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[job.status]}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">{job.department}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{job.job_type} · {job.work_mode}</span>
                </div>
                <p className="font-semibold text-foreground text-[15px] truncate">{job.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{job.location}</p>
              </div>

              {deleteId === job.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-destructive font-medium">Delete?</span>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(job.id)}>Yes</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>No</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(job)}>
                    <Pencil size={13} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(job.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
