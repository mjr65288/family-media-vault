const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateRegisterInput(input: unknown): ValidationResult<RegisterInput> {
  if (!isRecord(input)) {
    return { ok: false, error: "Invalid request body" };
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!name || !email || !password) {
    return { ok: false, error: "Name, email, and password are required" };
  }

  if (name.length > 100) {
    return { ok: false, error: "Name must be 100 characters or fewer" };
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { ok: false, error: "A valid email address is required" };
  }

  if (password.length < 12) {
    return { ok: false, error: "Password must be at least 12 characters" };
  }

  if (password.length > 128) {
    return { ok: false, error: "Password must be 128 characters or fewer" };
  }

  return { ok: true, data: { name, email, password } };
}

export function validateLoginInput(input: unknown): ValidationResult<LoginInput> {
  if (!isRecord(input)) {
    return { ok: false, error: "Invalid request body" };
  }

  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!email || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254 || password.length > 128) {
    return { ok: false, error: "Invalid email or password" };
  }

  return { ok: true, data: { email, password } };
}
