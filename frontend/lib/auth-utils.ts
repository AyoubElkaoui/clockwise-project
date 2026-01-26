// Helper functies voor veilig localStorage gebruik

const authUtils = {
  getUserId: (): number | null => {
    try {
      if (typeof window === "undefined") {
        return null;
      }
      const id = localStorage.getItem("userId");
      return id ? Number(id) : null;
    } catch (error) {
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

  getRole: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userRank");
  },

  getAllowedTasks: (): string => {
    if (typeof window === "undefined") return "BOTH";
    return localStorage.getItem("allowedTasks") || "BOTH";
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
export const getRole = authUtils.getRole;
export const getAllowedTasks = authUtils.getAllowedTasks;
export const getUserName = authUtils.getUserName;
export const isLoggedIn = authUtils.isLoggedIn;
export const requireAuth = authUtils.requireAuth;
export const clearAuth = authUtils.clearAuth;
