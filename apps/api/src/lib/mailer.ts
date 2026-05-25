import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";

type RenderedMessage = {
  subject: string;
  html: string;
  text: string;
  notificationTitle: string;
  notificationBody: string;
  link?: string;
};

const appBaseUrl = () => process.env.APP_BASE_URL ?? "http://localhost:3000";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function frame(title: string, body: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0f172a">
      <h2 style="margin:0 0 16px;color:#0f766e">${escapeHtml(title)}</h2>
      ${body}
      <p style="color:#64748b;font-size:13px;margin-top:32px">ZimRecruit</p>
    </div>`;
}

const TEMPLATES = {
  verification_approved: (data: { receiptHash: string; docTitle: string }): RenderedMessage => {
    const docTitle = escapeHtml(data.docTitle);
    const receiptHash = escapeHtml(data.receiptHash);
    return {
      subject: "Your document has been verified - ZimRecruit",
      html: frame(
        "Document verified",
        `
          <p>Your document <strong>${docTitle}</strong> has been verified and recorded in the Supabase mockchain ledger.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;font-size:13px;color:#166534"><strong>Receipt hash:</strong><br><code style="font-size:12px;word-break:break-all">${receiptHash}</code></p>
          </div>
          <p>You can verify this attestation from your ZimRecruit dashboard.</p>
        `
      ),
      text: `Your document ${data.docTitle} has been verified. Receipt hash: ${data.receiptHash}`,
      notificationTitle: "Document verified",
      notificationBody: `${data.docTitle} has been verified.`,
      link: "/applicant/documents",
    };
  },

  verification_rejected: (data: { docTitle: string; reason: string }): RenderedMessage => {
    const docTitle = escapeHtml(data.docTitle);
    const reason = escapeHtml(data.reason);
    return {
      subject: "Document verification update - ZimRecruit",
      html: frame(
        "Verification not approved",
        `
          <p>Your document <strong>${docTitle}</strong> could not be verified at this time.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please review the document and resubmit. If you believe this is an error, contact the verifying institution directly.</p>
        `
      ),
      text: `Your document ${data.docTitle} could not be verified. Reason: ${data.reason}`,
      notificationTitle: "Document verification update",
      notificationBody: `${data.docTitle} was not verified: ${data.reason}`,
      link: "/applicant/documents",
    };
  },

  interview_scheduled: (data: { jobTitle: string; company: string; scheduledAt: string; location: string }): RenderedMessage => {
    const jobTitle = escapeHtml(data.jobTitle);
    const company = escapeHtml(data.company);
    const scheduledAt = escapeHtml(data.scheduledAt);
    const location = escapeHtml(data.location);
    return {
      subject: `Interview scheduled - ${data.jobTitle} at ${data.company}`,
      html: frame(
        "Interview scheduled",
        `
          <p>Congratulations. <strong>${company}</strong> has scheduled an interview with you for the <strong>${jobTitle}</strong> role.</p>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0"><strong>Date and time:</strong> ${scheduledAt}</p>
            <p style="margin:8px 0 0"><strong>Location or link:</strong> ${location}</p>
          </div>
        `
      ),
      text: `${data.company} scheduled an interview for ${data.jobTitle} on ${data.scheduledAt}. Location/link: ${data.location}`,
      notificationTitle: "Interview scheduled",
      notificationBody: `${data.company} scheduled an interview for ${data.jobTitle} on ${data.scheduledAt}.`,
      link: "/applicant/applications",
    };
  },

  application_accepted: (data: { jobTitle: string; company: string }): RenderedMessage => {
    const jobTitle = escapeHtml(data.jobTitle);
    const company = escapeHtml(data.company);
    return {
      subject: `Application accepted for next stage - ${data.jobTitle} at ${data.company}`,
      html: frame(
        "Application accepted",
        `
          <p><strong>${company}</strong> has accepted your application for the next stage of the <strong>${jobTitle}</strong> role.</p>
          <p>Log in to your ZimRecruit dashboard for updates from the employer.</p>
        `
      ),
      text: `${data.company} accepted your application for the next stage of ${data.jobTitle}.`,
      notificationTitle: "Application accepted",
      notificationBody: `${data.company} accepted your application for the next stage of ${data.jobTitle}.`,
      link: "/applicant/applications",
    };
  },

  offer_extended: (data: { jobTitle: string; company: string }): RenderedMessage => {
    const jobTitle = escapeHtml(data.jobTitle);
    const company = escapeHtml(data.company);
    return {
      subject: `Offer extended - ${data.jobTitle} at ${data.company}`,
      html: frame(
        "Offer extended",
        `
          <p><strong>${company}</strong> has extended a job offer for the <strong>${jobTitle}</strong> role.</p>
          <p>Log in to your ZimRecruit dashboard to view and respond to the offer.</p>
          <p><a href="${appBaseUrl()}/applicant/applications" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none;font-weight:700">View offer</a></p>
        `
      ),
      text: `${data.company} has extended a job offer for ${data.jobTitle}. Log in to view it.`,
      notificationTitle: "Offer extended",
      notificationBody: `${data.company} extended an offer for ${data.jobTitle}.`,
      link: "/applicant/applications",
    };
  },

  admin_warning: (data: { reason: string; details?: string }): RenderedMessage => {
    const reason = escapeHtml(data.reason);
    const details = data.details ? `<p><strong>Details:</strong> ${escapeHtml(data.details)}</p>` : "";
    return {
      subject: "Important account warning - ZimRecruit",
      html: frame(
        "Account warning",
        `
          <p>An administrator has issued a warning on your ZimRecruit account.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          ${details}
          <p>Please review the site rules and correct the issue. Continued violations may lead to account restrictions.</p>
        `
      ),
      text: `An administrator issued a warning on your ZimRecruit account. Reason: ${data.reason}${data.details ? `. Details: ${data.details}` : ""}`,
      notificationTitle: "Account warning",
      notificationBody: data.details ? `${data.reason}: ${data.details}` : data.reason,
      link: "/applicant/profile",
    };
  },
} as const;

type TemplateName = keyof typeof TEMPLATES;
type TemplateData<T extends TemplateName> = Parameters<typeof TEMPLATES[T]>[0];

async function createInAppNotification(
  userId: string,
  templateName: TemplateName,
  message: RenderedMessage
): Promise<void> {
  await db.execute(
    `INSERT INTO notifications (id, recipient_id, type, title, body, link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      userId,
      templateName,
      message.notificationTitle,
      message.notificationBody,
      message.link ?? null,
    ]
  );
}

/** Persist an in-app notification; Supabase Realtime makes it immediately observable by the recipient. */
export async function notifyUser<T extends TemplateName>(
  templateName: T,
  userId: string,
  data: TemplateData<T>
): Promise<void> {
  const message = (TEMPLATES[templateName] as (d: typeof data) => RenderedMessage)(data);
  await createInAppNotification(userId, templateName, message);
}
