export type Credentials = {
  email: string;
  password: string;
};

export type CredentialsResult =
  | { ok: true; value: Credentials }
  | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCredentials(formData: FormData): CredentialsResult {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "有効なメールアドレスを入力してください。" };
  }

  if (password.length < 8) {
    return { ok: false, message: "パスワードは8文字以上で入力してください。" };
  }

  return { ok: true, value: { email, password } };
}
