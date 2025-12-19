// Helper functies voor veilig localStorage gebruik
console.log("auth-utils.ts loaded");

const authUtils = {
  getUserId: (): number | null => {
    try {
      console.log("getUserId called from auth-utils");
      if (typeof window === "undefined") {
        console.log("window is undefined");
        return null;
      }
      const id = localStorage.getItem("userId");
      const result = id ? Number(id) : null;
      console.log("getUserId returning:", result);
      return result;
    } catch (error) {
      console.error("Error in getUserId:", error);
      return null;
    }
  },

  getMedewGcId: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("medewGcId");
  },

  getUserRank: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userRank");
  },

  getUserName: (): { firstName: string; lastName: string } => {
    if (typeof window === "undefined") {
      return { firstName: "", lastName: "" };
    }
    return {
      firstName: localStorage.getItem("firstName") || "",
      lastName: localStorage.getItem("lastName") || "",
    };
  },

  isLoggedIn: (): boolean => {
    return authUtils.getUserId() !== null;
  },

  requireAuth: (router: any) => {
    if (!authUtils.isLoggedIn()) {
      router.push("/login");
      return false;
    }
    return true;
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  }
};

export default authUtils;

// Named exports for backward compatibility
export const getUserId = authUtils.getUserId;
export const getMedewGcId = authUtils.getMedewGcId;
export const getUserRank = authUtils.getUserRank;
export const getUserName = authUtils.getUserName;
export const isLoggedIn = authUtils.isLoggedIn;
export const requireAuth = authUtils.requireAuth;
export const clearAuth = authUtils.clearAuth;
