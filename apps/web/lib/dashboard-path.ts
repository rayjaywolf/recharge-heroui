export function getDashboardPath(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "DISTRIBUTOR") return "/distributor";
  return "/retailer";
}
