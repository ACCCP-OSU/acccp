import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// EMAIL_PROVIDER=console (default) logs the OTP instead of sending an email,
// so sign-in works locally with no Resend domain set up. Set to "resend" once
// RESEND_API_KEY / EMAIL_FROM are ready (a verified domain or subdomain).
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? "console";

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (EMAIL_PROVIDER === "console") {
    console.log(`[email-otp] ${email}: ${otp} (expires in 5 minutes)`);
    return;
  }

  const { error } = await getResendClient().emails.send({
    from: process.env.EMAIL_FROM as string,
    to: email,
    subject: "Your CarmenCanvas Accessibility Converter sign-in code",
    text: `Your sign-in code is ${otp}. It expires in 5 minutes.`,
  });
  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
