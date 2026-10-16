import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import net from "net";
import tls from "tls";

// ============================================================================
// Zero-Dependency Native SMTP Sender (Node.js net + tls)
// Works locally without 'npm install nodemailer' and natively on Vercel
// ============================================================================
interface SmtpMessageOptions {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}

function sendNativeSmtpEmail(opts: SmtpMessageOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const { host, port, user, pass, from, fromName, to, subject, text, html } = opts;
    const isDirectTls = port === 465;

    let socket: net.Socket | tls.TLSSocket;
    let buffer = "";
    let step = 0;
    let rcptIndex = 0;
    let isClosed = false;

    const cleanup = () => {
      if (!isClosed) {
        isClosed = true;
        clearTimeout(timeoutId);
        if (socket && !socket.destroyed) {
          socket.destroy();
        }
      }
    };

    const fail = (err: Error) => {
      cleanup();
      reject(err);
    };

    const timeoutId = setTimeout(() => {
      fail(new Error(`SMTP connection timed out after 15s to ${host}:${port}`));
    }, 15000);

    const sendLine = (line: string) => {
      if (!socket.destroyed) {
        socket.write(line + "\r\n");
      }
    };

    const handleSmtpReply = (code: number, rawLine: string) => {
      // Step 0: Server 220 banner
      if (step === 0) {
        if (code !== 220) {
          return fail(new Error(`Unexpected SMTP banner: ${rawLine}`));
        }
        step = 1;
        sendLine(`EHLO getamsh.com`);
        return;
      }

      // Step 1: EHLO response
      if (step === 1) {
        if (code !== 250) {
          return fail(new Error(`EHLO failed: ${rawLine}`));
        }
        if (!isDirectTls && (port === 587 || rawLine.includes("STARTTLS"))) {
          step = 2;
          sendLine("STARTTLS");
        } else if (user && pass) {
          step = 4;
          sendLine("AUTH LOGIN");
        } else {
          step = 6;
          sendLine(`MAIL FROM:<${from}>`);
        }
        return;
      }

      // Step 2: STARTTLS response (220)
      if (step === 2) {
        if (code !== 220) {
          return fail(new Error(`STARTTLS negotiation failed: ${rawLine}`));
        }

        // Upgrade raw socket to TLS
        socket.removeAllListeners("data");
        socket.removeAllListeners("error");

        const secureSocket = tls.connect({
          socket: socket,
          host,
          servername: host,
          rejectUnauthorized: false,
        });

        socket = secureSocket;
        attachSocketListeners(secureSocket);

        step = 3;
        sendLine("EHLO getamsh.com");
        return;
      }

      // Step 3: Post-TLS EHLO response
      if (step === 3) {
        if (code !== 250) {
          return fail(new Error(`Post-TLS EHLO failed: ${rawLine}`));
        }
        if (user && pass) {
          step = 4;
          sendLine("AUTH LOGIN");
        } else {
          step = 6;
          sendLine(`MAIL FROM:<${from}>`);
        }
        return;
      }

      // Step 4: AUTH LOGIN response (334) -> Send base64 username
      if (step === 4) {
        if (code !== 334) {
          return fail(new Error(`AUTH LOGIN declined by server: ${rawLine}`));
        }
        step = 5;
        sendLine(Buffer.from(user || "").toString("base64"));
        return;
      }

      // Step 5: Username accepted (334) -> Send base64 password
      if (step === 5) {
        if (code !== 334) {
          return fail(new Error(`Username declined by server: ${rawLine}`));
        }
        step = 51;
        sendLine(Buffer.from(pass || "").toString("base64"));
        return;
      }

      // Step 51: Password accepted (235)
      if (step === 51) {
        if (code !== 235) {
          return fail(new Error(`SMTP Authentication failed for ${user}: ${rawLine}`));
        }
        step = 6;
        sendLine(`MAIL FROM:<${from}>`);
        return;
      }

      // Step 6: MAIL FROM accepted (250)
      if (step === 6) {
        if (code !== 250) {
          return fail(new Error(`MAIL FROM failed: ${rawLine}`));
        }
        step = 7;
        rcptIndex = 0;
        sendLine(`RCPT TO:<${to[rcptIndex]}>`);
        return;
      }

      // Step 7: RCPT TO accepted (250 or 251)
      if (step === 7) {
        if (code !== 250 && code !== 251) {
          return fail(new Error(`RCPT TO failed for ${to[rcptIndex]}: ${rawLine}`));
        }
        rcptIndex++;
        if (rcptIndex < to.length) {
          sendLine(`RCPT TO:<${to[rcptIndex]}>`);
        } else {
          step = 8;
          sendLine("DATA");
        }
        return;
      }

      // Step 8: DATA command accepted (354)
      if (step === 8) {
        if (code !== 354) {
          return fail(new Error(`DATA command failed: ${rawLine}`));
        }
        step = 9;

        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const sender = fromName ? `"${fromName.replace(/"/g, "")}" <${from}>` : `<${from}>`;
        const b64Subject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;

        const mimeLines = [
          `From: ${sender}`,
          `To: ${to.join(", ")}`,
          `Subject: ${b64Subject}`,
          `Date: ${new Date().toUTCString()}`,
          `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${host}>`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset=UTF-8`,
          `Content-Transfer-Encoding: base64`,
          ``,
          Buffer.from(text, "utf-8").toString("base64"),
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset=UTF-8`,
          `Content-Transfer-Encoding: base64`,
          ``,
          Buffer.from(html, "utf-8").toString("base64"),
          ``,
          `--${boundary}--`,
          `.`,
        ];

        sendLine(mimeLines.join("\r\n"));
        return;
      }

      // Step 9: Message accepted for delivery (250)
      if (step === 9) {
        if (code !== 250) {
          return fail(new Error(`Email rejected: ${rawLine}`));
        }
        step = 10;
        sendLine("QUIT");
        cleanup();
        resolve(rawLine.trim());
        return;
      }
    };

    const attachSocketListeners = (s: net.Socket | tls.TLSSocket) => {
      s.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\r\n");
        // Keep partial trailing fragment in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          // RFC 5321: multiline response has hyphen after code (e.g. 250-);
          // the last line has a space (e.g. 250 ) or is 3 digits alone
          const match = line.match(/^(\d{3})([ -])?(.*)$/);
          if (match) {
            const code = parseInt(match[1], 10);
            const isContinuation = match[2] === "-";
            if (!isContinuation) {
              handleSmtpReply(code, line);
            }
          }
        }
      });

      s.on("error", (err) => {
        fail(err);
      });
    };

    if (isDirectTls) {
      socket = tls.connect({ host, port, rejectUnauthorized: false });
    } else {
      socket = net.createConnection({ host, port });
    }

    attachSocketListeners(socket);
  });
}

// Helper function to send email notification to founders
async function sendFounderNotificationEmail(app: {
  id: string;
  clinicName: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string;
  practiceType: string;
  dailyCalls: string;
  goals: string[];
  receivedAt: string;
}) {
  const smtpHost = process.env.SMTP_HOST || "mail.techycodex.com";
  const smtpUser =
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    "no-replay@techycodex.com";
  const smtpPass = (
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    "Hello@007"
  ).replace(/^["']|["']$/g, "");
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const fromEmail =
    process.env.SMTP_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    "no-replay@techycodex.com";
  const fromName = (
    process.env.SMTP_FROM_NAME ||
    process.env.FROM_NAME ||
    "Parikshit Verma"
  ).replace(/^["']|["']$/g, "");

  const recipientString =
    process.env.PILOT_NOTIFICATION_EMAILS ||
    "info@techycodex.com,parikshitverma865@gmail.com";
  const recipients = recipientString
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!smtpHost) {
    console.warn(
      "[PILOT EMAIL] SMTP_HOST not set, skipping email dispatch. Recipients would have been:",
      recipients
    );
    return;
  }

  const goalsList =
    app.goals.length > 0 ? app.goals.join(", ") : "None specified";

  const subject = `🚀 New Pilot Application: ${app.clinicName} (${app.fullName})`;
  const textBody = `
New AMSh Pilot Application Received!

Clinic / Practice: ${app.clinicName}
Full Name: ${app.fullName}
Email: ${app.email}
Phone / WhatsApp: ${app.phone || "Not provided"}
Location: ${app.location}
Practice Type: ${app.practiceType}
Approx. Daily Calls: ${app.dailyCalls}
Automation Goals: ${goalsList}

Lead ID: ${app.id}
Time: ${app.receivedAt}
  `.trim();

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 12px;">
        <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 22px;">🚀 New Clinic Pilot Application</h2>
        <p style="color: #64748b; margin: 0; font-size: 14px;">A clinic owner has requested to join the AMSh 14-Day Pilot Cohort.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; width: 38%; font-weight: 600;">Clinic / Practice:</td>
          <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${app.clinicName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Applicant Name:</td>
          <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${app.fullName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Business Email:</td>
          <td style="padding: 10px 0; color: #2563eb; font-weight: 600;"><a href="mailto:${app.email}" style="color: #2563eb; text-decoration: none;">${app.email}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Phone / WhatsApp:</td>
          <td style="padding: 10px 0; color: #0f172a;">${app.phone ? `<a href="https://wa.me/${app.phone.replace(/[^0-9]/g, "")}" style="color: #10b981; font-weight: 600; text-decoration: none;">${app.phone} (WhatsApp)</a>` : '<span style="color: #94a3b8;">Not provided</span>'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Location:</td>
          <td style="padding: 10px 0; color: #0f172a;">${app.location}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Practice Type:</td>
          <td style="padding: 10px 0; color: #0f172a;">${app.practiceType}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Inbound Calls / Day:</td>
          <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${app.dailyCalls}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Automation Goals:</td>
          <td style="padding: 10px 0; color: #0f172a;">${goalsList}</td>
        </tr>
      </table>

      <div style="background: #f8fafc; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b; margin-top: 20px;">
        <strong>Lead ID:</strong> ${app.id} &bull; <strong>Received:</strong> ${new Date(app.receivedAt).toUTCString()}
      </div>
    </div>
  `;

  // Check if SMTP password is set
  if (!smtpPass) {
    console.warn(
      "⚠️ [PILOT EMAIL]: SMTP_PASSWORD is not set in .env. Please add SMTP_PASSWORD in frontend/landing-page/.env to dispatch real emails to",
      recipients
    );
  }

  // 1. First attempt zero-dependency native SMTP client
  try {
    const res = await sendNativeSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      from: fromEmail,
      fromName: fromName,
      to: recipients,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log("✅ [PILOT EMAIL SENT VIA NATIVE SMTP]:", res, "to:", recipients);
    return;
  } catch (nativeErr: unknown) {
    const msg = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);
    console.warn("⚠️ [NATIVE SMTP FAILED]:", msg);

    // 2. Fallback to nodemailer if present in the environment (e.g. Vercel)
    try {
      // @ts-ignore
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        tls: { rejectUnauthorized: false },
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipients,
        subject,
        text: textBody,
        html: htmlBody,
      });
      console.log("✅ [PILOT EMAIL SENT VIA NODEMAILER]:", info.messageId, "to:", recipients);
    } catch (nodeMailerErr: unknown) {
      const nmMsg = nodeMailerErr instanceof Error ? nodeMailerErr.message : String(nodeMailerErr);
      console.error("❌ [PILOT EMAIL DISPATCH ERROR]:", nmMsg);
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clinicName,
      fullName,
      email,
      phone,
      location,
      practiceType,
      dailyCalls,
      goals,
      notes,
    } = body;

    if (!clinicName || !fullName || !email) {
      return NextResponse.json(
        { error: "Clinic Name, Full Name, and Business Email are required." },
        { status: 400 }
      );
    }

    const application = {
      id: `pilot_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      clinicName: String(clinicName).trim(),
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      location: location || "Other",
      practiceType: practiceType || "General medical clinic",
      dailyCalls: dailyCalls || "Not sure",
      goals: Array.isArray(goals) ? goals : [],
      notes: notes ? String(notes).trim() : null,
      status: "NEW_LEAD",
    };

    // 1. Store in local file storage (when running on server/Node)
    const storageDir = path.join(process.cwd(), "data");
    const filePath = path.join(storageDir, "pilot_applications.json");

    try {
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      let existing = [];
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          existing = JSON.parse(raw);
        } catch {
          existing = [];
        }
      }

      existing.unshift(application);
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");
    } catch (storageErr) {
      console.warn("Local storage write warning (standard on serverless):", storageErr);
    }

    console.log("🚀 [PILOT PROGRAM LEAD RECEIVED]:", application);

    // 2. Dispatch real-time SMTP Email notification to founders
    // (info@techycodex.com, parikshitverma865@gmail.com)
    await sendFounderNotificationEmail(application);

    return NextResponse.json({
      ok: true,
      message: "Application submitted successfully.",
      applicationId: application.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Pilot submission error:", message);
    return NextResponse.json(
      { error: "Internal server error submitting pilot application." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "pilot_applications.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ applications: [] });
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const list = JSON.parse(raw);
    return NextResponse.json({ applications: list });
  } catch {
    return NextResponse.json({ applications: [] });
  }
}
