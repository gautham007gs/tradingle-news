import { getServerApiBase } from "./site";

export type JobType = "full-time" | "part-time" | "contract" | "internship";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type JobStatus = "active" | "draft" | "closed";

export interface Job {
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

export interface JobsResult {
  jobs: Job[];
  total: number;
}

async function jobsFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getServerApiBase().replace(/\/api$/, "");
  const url = `${base}/api${path}`;
  const res = await fetch(url, {
    ...options,
    next: { revalidate: 120, tags: ["jobs"] },
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) throw new Error(`Jobs API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchJobs(status: JobStatus = "active"): Promise<Job[]> {
  try {
    const { data } = await jobsFetch<{ data: Job[] }>(
      `/jobs/list.php?status=${status}`
    );
    return data || [];
  } catch {
    return [];
  }
}

export function jobTypeLabel(t: JobType): string {
  return { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract", internship: "Internship" }[t] ?? t;
}

export function workModeLabel(m: WorkMode): string {
  return { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" }[m] ?? m;
}

export function salaryRange(job: Job): string | null {
  if (!job.salary_min && !job.salary_max) return null;
  const cur = job.salary_currency || "INR";
  const symbol = cur === "INR" ? "₹" : cur === "USD" ? "$" : cur;
  const fmt = (n: number) =>
    n >= 100000 ? `${symbol}${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `${symbol}${n.toLocaleString("en-IN")}`;
  if (job.salary_min && job.salary_max) return `${fmt(job.salary_min)} – ${fmt(job.salary_max)} / yr`;
  if (job.salary_min) return `From ${fmt(job.salary_min)} / yr`;
  if (job.salary_max) return `Up to ${fmt(job.salary_max!)} / yr`;
  return null;
}

/** Build JobPosting JSON-LD for a single job */
export function buildJobPostingJsonLd(job: Job, siteUrl = "https://www.tradingle.com") {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: `${job.description}\n\nRequirements:\n${job.requirements}`,
    identifier: { "@type": "PropertyValue", name: "Tradingle Media", value: String(job.id) },
    datePosted: job.posted_at,
    // schema.org valid EmploymentType values
    employmentType: ({
      "full-time": "FULL_TIME",
      "part-time": "PART_TIME",
      contract: "CONTRACTOR",
      internship: "INTERN",
    } as Record<string, string>)[job.job_type] ?? "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: "Tradingle Media Pvt. Ltd.",
      sameAs: siteUrl,
      logo: `${siteUrl}/favicon.ico`,
    },
    ...(job.work_mode !== "remote"
      ? {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.location || "New Delhi",
              addressCountry: "IN",
            },
          },
        }
      : {}),
    applicantLocationRequirements:
      job.work_mode === "remote" ? { "@type": "Country", name: "India" } : undefined,
    jobLocationType: job.work_mode === "remote" ? "TELECOMMUTE" : undefined,
    url: `${siteUrl}/careers`,
    directApply: Boolean(job.apply_url || job.apply_email),
  };

  if (job.salary_min || job.salary_max) {
    ld.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary_currency || "INR",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary_min ?? undefined,
        maxValue: job.salary_max ?? undefined,
        unitText: "YEAR",
      },
    };
  }

  if (job.expires_at) ld.validThrough = job.expires_at;

  // Strip undefined
  return JSON.parse(JSON.stringify(ld));
}
