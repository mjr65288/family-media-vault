const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Discriminated result for input validators: either parsed `data` or a user-facing `error` string. */
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

// Narrows `unknown` request-body JSON before touching its properties, since
// `JSON.parse` results (and thus `credentials` in auth.ts) are untyped.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Trims and lowercases an email so lookups/comparisons are case- and whitespace-insensitive. */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Validates and normalizes registration input from an untrusted request body.
 * Returns a typed {@link RegisterInput} on success, or a generic user-facing
 * error otherwise (errors are intentionally non-specific to avoid leaking
 * which field/rule failed).
 */
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

/**
 * Validates login input from an untrusted request body. Deliberately looser
 * than {@link validateRegisterInput} (no minimum password length) since this
 * only gates the shape of the request before hitting authorize() — the real
 * password check happens against the stored hash, and error messages here
 * stay generic ("Invalid email or password") to avoid confirming which part
 * was wrong.
 */
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
