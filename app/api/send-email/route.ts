import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParsedEmailFields = {
  from: string;
  to: string[];
  subject: string;
  bodyHtml: string;
};

function isValidEmail(email: string): boolean {
  return /^(?:[a-zA-Z0-9_'^&+\-])+(?:\.(?:[a-zA-Z0-9_'^&+\-])+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(
    email.trim()
  );
}

function parseCommaOrArray(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : ""))
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
  }
  const text = typeof value === "string" ? value : "";
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function parseRequest(req: NextRequest): Promise<{
  fields: ParsedEmailFields;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}> {
  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.toLowerCase().includes("multipart/form-data");

  if (isMultipart) {
    const form = await req.formData();
    const from = String(form.get("from") || "");
    const to = parseCommaOrArray(form.get("to"));
    const subject = String(form.get("subject") || "");
    const bodyHtml = String(form.get("bodyHtml") || "");

    const fileEntries = form.getAll("attachments");
    const attachments: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }> = [];
    for (const entry of fileEntries) {
      if (entry instanceof File) {
        const arrayBuffer = await entry.arrayBuffer();
        attachments.push({
          filename: entry.name,
          content: Buffer.from(arrayBuffer),
          contentType: entry.type || undefined,
        });
      }
    }

    return {
      fields: { from, to, subject, bodyHtml },
      attachments,
    };
  }

  // JSON fallback
  const json = (await req
    .json()
    .catch(() => ({}))) as Partial<ParsedEmailFields> & {
    attachments?: Array<{
      filename: string;
      content: string;
      contentType?: string;
    }>;
  };
  const fields: ParsedEmailFields = {
    from: json.from || "",
    to: json.to || [],
    subject: json.subject || "",
    bodyHtml: json.bodyHtml || "",
  };
  const attachments = (json.attachments || []).map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content, "base64"),
    contentType: a.contentType,
  }));
  return { fields, attachments };
}

export async function POST(req: NextRequest) {
  try {
    const { fields, attachments } = await parseRequest(req);
    const { from, to, subject, bodyHtml } = fields;

    if (!from || !isValidEmail(from)) {
      return NextResponse.json(
        { error: "Valid 'from' email is required" },
        { status: 400 }
      );
    }
    if (!to.length || !to.every(isValidEmail)) {
      return NextResponse.json(
        { error: "Provide at least one valid 'to' email" },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure =
      String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

    // Debug logging
    console.log("SMTP Config:", {
      host,
      port,
      user: user ? "***" : undefined,
      secure,
    });

    if (!host || !user || !pass) {
      return NextResponse.json(
        { error: "SMTP credentials are not configured on the server" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from,
      to: to.join(","),
      subject,
      html: bodyHtml || "",
      attachments,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: unknown) {
    console.error("Email sending error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while sending email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
