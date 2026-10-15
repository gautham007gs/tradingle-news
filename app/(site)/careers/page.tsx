import type { Metadata } from "next";
import { MapPin, Clock, Briefcase, Monitor, ArrowRight, Mail } from "lucide-react";
import { fetchJobs, jobTypeLabel, workModeLabel, salaryRange } from "../../../lib/jobs";
import type { Job } from "../../../lib/jobs";
import { absoluteUrl } from "../../../lib/site";
import JsonLd from "../../../components/JsonLd";
import Link from "next/link";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Careers at Tradingle â€” Join Our Team",
  description:
    "Explore open positions at Tradingle Media. We're hiring journalists, engineers, designers and business professionals passionate about independent news.",
  alternates: { canonical: absoluteUrl("/careers") },
  openGraph: {
    title: "Careers at Tradingle",
    description: "Help us build India's leading independent newsroom.",
    url: absoluteUrl("/careers"),
    type: "website",
  },
};

const DEPARTMENTS = [
  "Editorial",
  "Engineering",
  "Product & Design",
  "Sales & Partnerships",
  "Operations",
  "Internships",
];

const WORK_MODE_COLORS: Record<string, string> = {
  remote: "bg-emerald-50 text-emerald-700 border-emerald-200",
  hybrid: "bg-blue-50 text-blue-700 border-blue-200",
  onsite: "bg-amber-50 text-amber-700 border-amber-200",
};

function JobCard({ job }: { job: Job }) {
  const salary = salaryRange(job);
  const applyHref = job.apply_url || `mailto:${job.apply_email || "careers@tradingle.com"}?subject=${encodeURIComponent(`Application: ${job.title}`)}`;

  return (
    <article className="careers-job-card group">
      <div className="careers-job-header">
        <div className="careers-job-meta-top">
          <span className="careers-job-dept">{job.department}</span>
          <span className={`careers-work-badge ${WORK_MODE_COLORS[job.work_mode] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
            <Monitor size={10} aria-hidden />
            {workModeLabel(job.work_mode)}
          </span>
        </div>
        <h2 className="careers-job-title transition-colors group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
          {job.title}
        </h2>
      </div>

      <div className="careers-job-tags">
        <span className="careers-tag">
          <Clock size={12} aria-hidden />
          {jobTypeLabel(job.job_type)}
        </span>
        <span className="careers-tag">
          <MapPin size={12} aria-hidden />
          {job.location}
        </span>
        {salary && (
          <span className="careers-tag careers-tag--salary">
            {salary}
          </span>
        )}
      </div>

      {job.description && (
        <p className="careers-job-excerpt">
          {job.description.length > 220 ? job.description.slice(0, 217) + "â€¦" : job.description}
        </p>
      )}

      <div className="careers-job-footer">
        <a
          href={applyHref}
          target={job.apply_url ? "_blank" : undefined}
          rel={job.apply_url ? "noopener noreferrer" : undefined}
          className="careers-apply-btn"
        >
          Apply Now <ArrowRight size={14} aria-hidden />
        </a>
        <span className="careers-job-posted">
          Posted{" "}
          {new Date(job.posted_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </article>
  );
}

export default async function CareersPage() {
  const jobs = await fetchJobs("active");

  // Group by department
  const byDept: Record<string, Job[]> = {};
  for (const job of jobs) {
    const dept = job.department || "General";
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(job);
  }

  return (
    <main id="main-content" className="min-h-screen">
      {/* Issue #85: JobPosting JSON-LD belongs on individual job detail pages,
          not on the listing page. Google requires JobPosting to be on the page
          where users can directly apply to that specific job. The listing page
          uses WebPage schema instead which is correct for an index page. */}
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Careers at Tradingle",
        "url": absoluteUrl("/careers"),
        "description": "Explore open positions at Tradingle Media. We're hiring journalists, engineers, designers and business professionals passionate about independent news.",
      }} />

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="careers-hero">
        <div className="trd-container careers-hero-inner">
          <div className="careers-hero-badge">
            <Briefcase size={14} aria-hidden />
            We're Hiring
          </div>
          <h1 className="careers-hero-title">
            Build the future of<br />
            <span className="careers-hero-accent">independent journalism</span>
          </h1>
          <p className="careers-hero-desc">
            Tradingle is India's fastest-growing digital newsroom. We're looking for
            journalists, engineers, designers and business professionals who believe
            in fearless, fact-driven reporting.
          </p>
          <div className="careers-hero-stats">
            <div className="careers-stat">
              <span className="careers-stat-num">{jobs.length}</span>
              <span className="careers-stat-label">Open roles</span>
            </div>
            <div className="careers-stat-divider" />
            <div className="careers-stat">
              <span className="careers-stat-num">{Object.keys(byDept).length || "â€”"}</span>
              <span className="careers-stat-label">Departments</span>
            </div>
            <div className="careers-stat-divider" />
            <div className="careers-stat">
              <span className="careers-stat-num">2023</span>
              <span className="careers-stat-label">Founded</span>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Values strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="careers-values-strip">
        <div className="trd-container careers-values-grid">
          {[
            { title: "Editorial independence", body: "No advertiser, investor or political party tells us what to write." },
            { title: "Remote-friendly", body: "Most roles are hybrid or fully remote. Work where you do your best thinking." },
            { title: "Fast growth", body: "Launched in 2023, we've already broken stories that made national headlines." },
            { title: "Meaningful work", body: "Every story we publish reaches readers who depend on it to make decisions." },
          ].map((v) => (
            <div key={v.title} className="careers-value-card">
              <h3 className="careers-value-title">{v.title}</h3>
              <p className="careers-value-body">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ Job listings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="trd-container careers-listings-section">
        <div className="careers-section-head">
          <h2 className="careers-section-title">Open Positions</h2>
          {jobs.length > 0 && (
            <span className="careers-count-badge">{jobs.length} role{jobs.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="careers-empty">
            <Briefcase size={40} className="careers-empty-icon" aria-hidden />
            <h3 className="careers-empty-title">No open positions right now</h3>
            <p className="careers-empty-desc">
              We're not actively hiring at the moment, but we'd love to hear from
              talented people. Send your CV to{" "}
              <a href="mailto:careers@tradingle.com" className="careers-email-link">
                careers@tradingle.com
              </a>{" "}
              and we'll keep you in mind.
            </p>
          </div>
        ) : (
          <div className="careers-jobs-grid">
            {Object.keys(byDept).length > 1
              ? Object.entries(byDept).map(([dept, deptJobs]) => (
                  <div key={dept} className="careers-dept-group">
                    <h3 className="careers-dept-label">{dept}</h3>
                    <div className="careers-dept-jobs">
                      {deptJobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  </div>
                ))
              : jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </section>

      {/* â”€â”€ Speculative CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="careers-cta-section trd-container">
        <div className="careers-cta-card">
          <Mail size={28} className="careers-cta-icon" aria-hidden />
          <div>
            <h3 className="careers-cta-title">Don't see your role?</h3>
            <p className="careers-cta-body">
              We're always on the lookout for exceptional talent. Send us your CV
              and tell us how you'd contribute.
            </p>
          </div>
          <a href="mailto:careers@tradingle.com" className="careers-cta-btn">
            Get in touch
          </a>
        </div>
      </section>
    </main>
  );
}
