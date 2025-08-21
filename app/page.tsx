"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

type TagInputProps = {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
};

function isValidEmail(email: string) {
  return /^(?:[a-zA-Z0-9_'^&+\-])+(?:\.(?:[a-zA-Z0-9_'^&+\-])+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(
    email.trim()
  );
}

function TagInput({ label, placeholder, values, onChange }: TagInputProps) {
  const [input, setInput] = useState("");
  const add = useCallback(() => {
    const pieces = input
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!pieces.length) return;
    const next = [...values];
    for (const p of pieces) {
      if (isValidEmail(p) && !next.includes(p)) next.push(p);
    }
    onChange(next);
    setInput("");
  }, [input, values, onChange]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-sm"
          >
            {v}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-800"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[160px] outline-none text-sm py-1"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </div>
      {!values.every(isValidEmail) && (
        <p className="text-xs text-red-600">One or more emails are invalid.</p>
      )}
    </div>
  );
}

export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: true })],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] prose max-w-none focus:outline-none p-3 rounded-md bg-white border border-gray-200",
      },
    },
  });

  const bodyHtml = useMemo(
    () => editor?.getHTML() || "",
    [editor, editor?.state]
  );

  const canSubmit = useMemo(() => {
    return (
      isValidEmail(from) &&
      to.length > 0 &&
      to.every(isValidEmail) &&
      subject.trim().length > 0
    );
  }, [from, to, subject]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setIsSending(true);
      setStatus(null);
      try {
        const form = new FormData();
        form.set("from", from);
        form.set("to", to.join(","));
        form.set("subject", subject);
        form.set("bodyHtml", bodyHtml);
        const files = fileInputRef.current?.files;
        if (files && files.length) {
          Array.from(files).forEach((f) => form.append("attachments", f));
        }
        const res = await fetch("/api/send-email", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to send email");
        setStatus({ type: "success", message: "Email sent successfully." });
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to send email",
        });
      } finally {
        setIsSending(false);
      }
    },
    [from, to, subject, bodyHtml, canSubmit]
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Send Referral Email
          </h1>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  From
                </label>
                <input
                  type="email"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                {from && !isValidEmail(from) && (
                  <p className="text-xs text-red-600">
                    Enter a valid sender email.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            <TagInput
              label="To"
              placeholder="Add recipient and press Enter"
              values={to}
              onChange={setTo}
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Body</label>
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="flex gap-2 border-b border-gray-200 p-2">
                  <button
                    type="button"
                    className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                  >
                    Bold
                  </button>
                  <button
                    type="button"
                    className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                  >
                    Italic
                  </button>
                  <button
                    type="button"
                    className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                    onClick={() =>
                      editor?.chain().focus().toggleBulletList().run()
                    }
                  >
                    Bulleted List
                  </button>
                </div>
                <EditorContent editor={editor} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Attachments
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {status && (
              <div
                className={
                  status.type === "success"
                    ? "text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                    : "text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                }
              >
                {status.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={!canSubmit || isSending}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
