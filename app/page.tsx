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
    <div className="flex flex-col gap-3">
      <label className="text-black font-semibold text-black-800">{label}</label>
      <div className="flex flex-wrap gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 text-sm font-medium shadow-sm"
          >
            {v}
            <button
              type="button"
              className="text-white hover:text-blue-100 transition-colors"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[200px] outline-none text-black py-1 placeholder-gray-500"
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
        <p className="text-sm text-red-600 font-medium">
          One or more emails are invalid.
        </p>
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
          "min-h-[200px] prose max-w-none focus:outline-none text-black leading-relaxed text-black-800",
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 p-8 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Send Referral Email
          </h1>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <label className="text-black font-semibold text-black-800">
                  From
                </label>
                <input
                  type="email"
                  className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="you@example.com"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                {from && !isValidEmail(from) && (
                  <p className="text-sm text-red-600 font-medium">
                    Enter a valid sender email.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-black font-semibold text-black-800">
                  Subject
                </label>
                <input
                  type="text"
                  className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <TagInput
                label="To"
                placeholder="Add recipient and press Enter"
                values={to}
                onChange={setTo}
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-black font-semibold text-black-800">
                Body
              </label>
              <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
                <div className="flex gap-3 border-b-2 border-gray-200 p-4 bg-gray-50">
                  <button
                    type="button"
                    className="text-sm px-4 py-2 rounded-lg hover:bg-blue-100 hover:text-blue-700 font-medium transition-colors"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    className="text-sm px-4 py-2 rounded-lg hover:bg-blue-100 hover:text-blue-700 font-medium transition-colors"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    className="text-sm px-4 py-2 rounded-lg hover:bg-blue-100 hover:text-blue-700 font-medium transition-colors"
                    onClick={() =>
                      editor?.chain().focus().toggleBulletList().run()
                    }
                  >
                    • List
                  </button>
                </div>
                <div className="p-4">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-black font-semibold text-black-800">
                Attachments
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {status && (
              <div
                className={
                  status.type === "success"
                    ? "text-black text-green-800 bg-green-100 border-2 border-green-300 rounded-xl px-4 py-3 font-medium"
                    : "text-black text-red-800 bg-red-100 border-2 border-red-300 rounded-xl px-4 py-3 font-medium"
                }
              >
                {status.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-4 pt-6">
              <button
                type="submit"
                disabled={!canSubmit || isSending}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 text-lg font-bold shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {isSending ? "Sending…" : "Send Referral Email"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
