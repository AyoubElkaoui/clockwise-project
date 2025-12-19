// Helper functies voor veilig localStorage gebruik

export function getMedewGcId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("medewGcId");
}

export function getUserRank(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userRank");
}

export function getUserName(): { firstName: string; lastName: string } {
  if (typeof window === "undefined") {
    return { firstName: "", lastName: "" };
  }
  return {
    firstName: localStorage.getItem("firstName") || "",
    lastName: localStorage.getItem("lastName") || "",
  };
}

export function isLoggedIn(): boolean {
  return getUserId() !== null;
}

export function requireAuth(router: any) {
  if (!isLoggedIn()) {
    router.push("/login");
    return false;
  }
  return true;
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.clear();
  }
}
