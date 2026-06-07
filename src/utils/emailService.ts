import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  "Biswajit Phukan Editor Panel <no-reply@biswajitphukan.in>";
const LOGIN_URL =
  process.env.ADMIN_LOGIN_URL || "https://biswajitphukan.in/editor/login";

interface EditorCredentials {
  to: string;
  name: string;
  email: string;
  password: string;
}

export async function sendEditorCredentialsEmail({
  to,
  name,
  email,
  password,
}: EditorCredentials): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h2>Welcome to Biswajit Phukan Editor Panel, ${name}</h2>
      <p>An editor account has been created for you. Use the credentials below to sign in.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px">${email}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Password</td><td style="padding:6px 12px"><code>${password}</code></td></tr>
      </table>
      <p>Sign in here: <a href="${LOGIN_URL}">${LOGIN_URL}</a></p>
      <p style="color:#b00">For security, change your password after first login.</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Your Biswajit Phukan Editor Panel Account",
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
