import type { Locale } from "@/lib/i18n";

export type AppErrorCode =
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_EMAIL_ALREADY_EXISTS"
  | "AUTH_WEAK_PASSWORD"
  | "AUTH_NOT_AUTHENTICATED"
  | "SERVICE_NOT_FOUND"
  | "SERVICE_FORBIDDEN"
  | "ORDER_NOT_ALLOWED"
  | "QUOTE_NOT_ALLOWED"
  | "MESSAGE_NOT_ALLOWED"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "SUPABASE_NOT_CONFIGURED"
  | "UNKNOWN";

export class AppError extends Error {
  code: AppErrorCode;
  cause?: unknown;
  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Map a raw error from Supabase / fetch into a stable AppError code.
 * Keeps technical details out of the UI; logs them to the console for devs.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const raw = err as { message?: string; code?: string; status?: number };
  const message = String(raw?.message ?? err ?? "Unknown error");
  const code = String(raw?.code ?? "");
  // eslint-disable-next-line no-console
  console.error("[Khidma] error:", code || raw?.status, message);

  if (/already.*registered|already.*exists|duplicate key/i.test(message))
    return new AppError("AUTH_EMAIL_ALREADY_EXISTS", message, err);
  if (/invalid login|invalid credentials|invalid email or password/i.test(message))
    return new AppError("AUTH_INVALID_CREDENTIALS", message, err);
  if (/password.*(short|weak|6)/i.test(message))
    return new AppError("AUTH_WEAK_PASSWORD", message, err);
  if (raw?.status === 401 || /not authenticated|jwt/i.test(message))
    return new AppError("AUTH_NOT_AUTHENTICATED", message, err);
  if (raw?.status === 403 || /forbidden|policy|row.*level.*security/i.test(message))
    return new AppError("UNAUTHORIZED", message, err);
  if (raw?.status === 404 || /not found/i.test(message))
    return new AppError("SERVICE_NOT_FOUND", message, err);
  if (raw?.status === 429 || /rate.?limit/i.test(message))
    return new AppError("RATE_LIMITED", message, err);

  return new AppError("UNKNOWN", message, err);
}

const friendly: Record<AppErrorCode, { en: string; ar: string }> = {
  AUTH_INVALID_CREDENTIALS: {
    en: "Wrong email or password.",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  },
  AUTH_EMAIL_ALREADY_EXISTS: {
    en: "An account with this email already exists.",
    ar: "يوجد حساب مسجل بهذا البريد الإلكتروني.",
  },
  AUTH_WEAK_PASSWORD: {
    en: "Password must be at least 6 characters.",
    ar: "يجب أن تكون كلمة المرور 6 أحرف على الأقل.",
  },
  AUTH_NOT_AUTHENTICATED: {
    en: "Please log in to continue.",
    ar: "يرجى تسجيل الدخول للمتابعة.",
  },
  SERVICE_NOT_FOUND: { en: "Service not found.", ar: "الخدمة غير موجودة." },
  SERVICE_FORBIDDEN: {
    en: "You don't have permission for this service.",
    ar: "ليس لديك صلاحية على هذه الخدمة.",
  },
  ORDER_NOT_ALLOWED: {
    en: "You can't place this order.",
    ar: "لا يمكنك إنشاء هذا الطلب.",
  },
  QUOTE_NOT_ALLOWED: {
    en: "You can't send this quote.",
    ar: "لا يمكنك إرسال هذا العرض.",
  },
  MESSAGE_NOT_ALLOWED: {
    en: "You can't send this message.",
    ar: "لا يمكنك إرسال هذه الرسالة.",
  },
  VALIDATION_ERROR: {
    en: "Please check the highlighted fields.",
    ar: "يرجى التحقق من الحقول المميزة.",
  },
  UNAUTHORIZED: { en: "Not authorised.", ar: "غير مصرح." },
  RATE_LIMITED: {
    en: "Too many requests, please slow down.",
    ar: "طلبات كثيرة، يرجى التمهل.",
  },
  SUPABASE_NOT_CONFIGURED: {
    en: "Backend not configured. Running in offline demo mode.",
    ar: "الخادم غير متصل. يعمل التطبيق في وضع العرض المحلي.",
  },
  UNKNOWN: { en: "Something went wrong.", ar: "حدث خطأ ما." },
};

export function friendlyMessage(err: unknown, locale: Locale = "en"): string {
  const e = toAppError(err);
  return friendly[e.code]?.[locale] ?? friendly.UNKNOWN[locale];
}
