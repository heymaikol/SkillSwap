import { createStore } from "vuex";
import axios from "axios";
import jwtDecode from "jwt-decode";

// Simple storage wrapper for localStorage
const storage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Storage access error for ${key}:`, e);
      return null;
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Storage write error for ${key}:`, e);
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Storage delete error for ${key}:`, e);
    }
  },
};

// ponytail: jwtDecode is cheap; no cache needed
const decodeToken = (token) => {
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    if (!decoded || typeof decoded !== "object") {
      return null;
    }
    return decoded;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Token decoding error:", error);
    }
    return null;
  }
};

// Token validation function with improved safety
const isTokenValid = (token) => {
  if (!token) return false;

  try {
    const decoded = decodeToken(token);

    // More thorough validation
    if (!decoded) return false;
    if (!decoded.exp) return false;
    if (!decoded.user_id && !decoded.sub) return false;

    // Check expiration
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return decoded.exp > nowInSeconds;
  } catch (error) {
    return false;
  }
};

// Helper to clear auth state
const clearAuthState = (state) => {
  state.user = null;
  state.token = null;
  state.rememberMe = false;

  storage.removeItem("token");
  storage.removeItem("user");
  storage.removeItem("rememberMe");

  try {
    sessionStorage.removeItem("sessionMarker");
  } catch (e) {
    // Ignore sessionStorage errors
  }
};

export default createStore({
  state: {
    user: null,
    token: null,
    rememberMe: false,
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
      storage.setItem("user", JSON.stringify(user));
    },
    setToken(state, token) {
      state.token = token;
      storage.setItem("token", token);
    },
    setRememberMe(state, value) {
      state.rememberMe = value;
      storage.setItem("rememberMe", value.toString());
    },
    updateUser(state, userUpdates) {
      const updatedUser = { ...state.user, ...userUpdates };
      state.user = updatedUser;
      storage.setItem("user", JSON.stringify(updatedUser));
    },
    logout(state) {
      clearAuthState(state);
    },
    initializeStore(state) {
      try {
        const storedToken = storage.getItem("token");
        if (!storedToken) return;

        if (!isTokenValid(storedToken)) {
          clearAuthState(state);
          return;
        }

        const storedRememberMe = storage.getItem("rememberMe") === "true";
        let sessionMarker;

        try {
          sessionMarker = sessionStorage.getItem("sessionMarker");
        } catch {
          sessionMarker = null;
        }

        if (!storedRememberMe && !sessionMarker) {
          clearAuthState(state);
          return;
        }

        try {
          sessionStorage.setItem("sessionMarker", "active");
        } catch {
          // Fallback if sessionStorage is unavailable
          console.warn("Session storage unavailable");
        }

        state.token = storedToken;
        state.rememberMe = storedRememberMe;

        const storedUserJSON = storage.getItem("user");
        if (storedUserJSON) {
          try {
            state.user = JSON.parse(storedUserJSON);
          } catch {
            state.user = null;
          }
        }
      } catch (error) {
        console.warn("Authentication state restoration failed:", error);
        clearAuthState(state);
      }
    },
  },
  actions: {
    async login({ commit }, credentials) {
      const response = await axios.post("/api/auth/login", credentials);
      const token = response.data.token;

      commit("setToken", token);
      commit("setRememberMe", !!credentials.rememberMe);

      // Set session marker immediately after successful login
      try {
        sessionStorage.setItem("sessionMarker", "active");
      } catch {
        // Fallback if sessionStorage is unavailable
        console.warn("Session storage unavailable");
      }

      const decoded = decodeToken(token);
      if (!decoded) {
        throw new Error("Invalid authentication token received");
      }

      const user = {
        id: decoded.user_id || 0,
        email: decoded.email || "",
        role: decoded.role || "User",
        name: decoded.name || "Test User",
        bio: decoded.bio || "",
      };

      commit("setUser", user);
      return user;
    },
    async register({ commit }, credentials) {
      const response = await axios.post("/api/auth/register", credentials);
      const token = response.data.token;

      commit("setToken", token);
      commit("setRememberMe", true);

      // Set session marker for register too
      try {
        sessionStorage.setItem("sessionMarker", "active");
      } catch {
        // Fallback if sessionStorage is unavailable
        console.warn("Session storage unavailable");
      }

      const decoded = decodeToken(token);
      if (!decoded) {
        throw new Error("Invalid authentication token received");
      }

      const user = {
        id: decoded.user_id || 0,
        email: decoded.email || "",
        role: decoded.role || "User",
        name: credentials.name || "New User",
        bio: "",
      };

      commit("setUser", user);
      return user;
    },
    logout({ commit }) {
      commit("logout");
    },
    updateProfile({ commit }, profileData) {
      commit("updateUser", profileData);
    },
    initializeStore({ commit }) {
      commit("initializeStore");
    },
  },
  getters: {
    isAuthenticated: (state) => !!state.token,
    user: (state) => state.user,
    hasRole: (state) => {
      return (role) => {
        return state.user && state.user.role === role;
      };
    },
  },
});
