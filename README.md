EmailSystem – Single-page email sender (Next.js + Nodemailer)

Overview
This app lets you send one email (single subject/body) to multiple recipients with optional CC/BCC and file attachments. It features a modern UI built with Tailwind CSS and a rich text editor powered by TipTap. The backend uses a Next.js API route with Nodemailer.

Features

- Multi-recipient: add multiple emails to To, plus optional CC/BCC
- Rich text body (bold, italic, lists)
- Attachments (multiple files)
- Client-side validation and loading state
- Clear success/error feedback

Getting started

1. Install dependencies

```bash
npm i
# if packages are missing, run:
npm i nodemailer formidable @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

2. Configure SMTP credentials in `.env.local`
   Create `email/.env.local` (or copy from `.env.local.example`) with your SMTP provider values:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

3. Run the app

```bash
npm run dev
```

Open http://localhost:3000

Usage

- Fill From with a valid email address.
- Add one or more recipients in To (press Enter or comma to add). CC/BCC are optional.
- Provide a Subject and compose the Body with formatting.
- Optionally attach one or more files.
- Click Send Email. You will see success or a descriptive error from the server.

Project structure

- `app/page.tsx`: Single-page UI with the email form, TipTap editor, validation, and submission logic.
- `app/api/send-email/route.ts`: Next.js API route that parses multipart form-data (attachments) or JSON, validates input, and sends the email via Nodemailer.
- `app/layout.tsx`, `app/globals.css`: App chrome and Tailwind CSS configuration.

Environment & security

- SMTP credentials are only read on the server in the API route.
- Do not commit `.env.local`.

Notes

- If your SMTP requires SSL/TLS on port 465, set `SMTP_SECURE=true` and `SMTP_PORT=465`.
- Some providers require the From address to match the authenticated account.
