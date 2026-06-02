export function getRegisterErrorMessage(data: unknown): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    const message = (data as { error: string }).error.trim();
    if (message.length > 0) {
      return message;
    }
  }

  return "Registration failed.";
}
