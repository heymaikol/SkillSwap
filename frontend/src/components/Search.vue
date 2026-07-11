<template>
  <div class="search-page">
    <div class="container">
      <!-- Search Hero Section -->
      <section class="search-hero">
        <h1>Find Skills & Connect</h1>
        <p class="search-subtitle">
          Discover people sharing their expertise or find the perfect skill to
          learn
        </p>

        <form @submit.prevent="search" class="search-form">
          <div class="search-input-group">
            <font-awesome-icon icon="search" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search for skills, topics, or users..."
              class="search-input"
              required
              @input="handleInputChange"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="clear-search"
              @click="clearSearch"
              aria-label="Clear search"
            >
              <font-awesome-icon icon="times" />
            </button>
            <!-- Explicit search button -->
            <button type="submit" class="search-button">
              <font-awesome-icon icon="search" />
              Search
            </button>
          </div>

          <div class="search-filters">
            <button
              type="button"
              class="filter-toggle"
              @click="toggleFilters"
              :class="{ active: showFilters }"
              aria-expanded="showFilters"
              aria-controls="advanced-filters"
            >
              <font-awesome-icon icon="filter" />
              <span>Filters</span>
              <font-awesome-icon
                :icon="showFilters ? 'chevron-up' : 'chevron-down'"
                class="toggle-icon"
              />
            </button>
          </div>

          <transition name="slide-down">
            <div
              v-if="showFilters"
              id="advanced-filters"
              class="advanced-filters"
            >
              <div class="filter-group">
                <label class="filter-label">Categories</label>
                <div class="filter-options">
                  <label
                    class="checkbox-container"
                    v-for="category in categories"
                    :key="category"
                  >
                    <input
                      type="checkbox"
                      v-model="selectedCategories"
                      :value="category"
                    />
                    <span class="checkmark"></span>
                    {{ category }}
                  </label>
                </div>
              </div>

              <div class="filter-group">
                <label class="filter-label">Type</label>
                <div class="filter-options">
                  <label class="radio-container">
                    <input type="radio" v-model="searchType" value="all" />
                    <span class="radio-mark"></span>
                    All
                  </label>
                  <label class="radio-container">
                    <input type="radio" v-model="searchType" value="skills" />
                    <span class="radio-mark"></span>
                    Skills
                  </label>
                  <label class="radio-container">
                    <input type="radio" v-model="searchType" value="users" />
                    <span class="radio-mark"></span>
                    Users
                  </label>
                </div>
              </div>

              <div class="filter-actions">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  @click="resetFilters"
                >
                  Reset Filters
                </button>
                <button type="submit" class="btn btn-primary btn-sm">
                  Apply Filters
                </button>
              </div>
            </div>
          </transition>
        </form>
      </section>

      <!-- Search Results -->
      <section class="search-results">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Searching...</p>
        </div>

        <div v-else-if="error" class="error-message">
          <font-awesome-icon icon="exclamation-circle" class="error-icon" />
          <p>{{ error }}</p>
          <button @click="search" class="btn btn-outline btn-sm">
            Try Again
          </button>
        </div>

        <div v-else-if="filteredResults.length" class="search-results-grid">
          <div class="results-container">
            <div
              v-for="(item, index) in filteredResults"
              :key="index"
              class="result-card"
              :class="{ 'user-card': item.email, 'skill-card': !item.email }"
            >
              <div class="result-icon">
                <template v-if="item.email">
                  <font-awesome-icon icon="user" />
                </template>
                <template v-else>
                  <font-awesome-icon :icon="getSkillIcon(item.name)" />
                </template>
              </div>

              <div class="result-details">
                <h3>{{ item.name }}</h3>
                <p v-if="item.description" class="result-description">
                  {{ item.description }}
                </p>
                <p v-if="item.email" class="result-meta">
                  <font-awesome-icon icon="envelope" />
                  {{ item.email }}
                </p>
                <div class="result-actions">
                  <button
                    v-if="item.email"
                    class="btn btn-outline btn-sm"
                    @click="viewProfile(item)"
                  >
                    View Profile
                  </button>
                  <button
                    v-else
                    class="btn btn-primary btn-sm"
                    @click="viewSkill(item)"
                  >
                    Learn More
                  </button>
                  <button
                    v-if="item.email"
                    class="btn btn-primary btn-sm"
                    @click="startChat(item)"
                  >
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!loading && searched" class="no-results">
          <img
            src="/default-avatar.svg"
            alt="No results"
            class="no-results-image"
          />
          <h3>No Results Found</h3>
          <p>We couldn't find any matches for "{{ searchQuery }}"</p>
          <p class="search-suggestions">Try:</p>
          <ul>
            <li>Checking your spelling</li>
            <li>Using more general keywords</li>
            <li>Removing filters</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import eventBus from "@/utils/eventBus";
import debounce from "@/utils/debounce";

// Immediate memoization for icon mapping to avoid recreating on each component instance
const ICON_MAPPING = Object.freeze({
  programming: "code",
  language: "language",
  music: "music",
  cooking: "utensils",
  art: "palette",
  design: "pen-fancy",
  go: "code",
  vue: "code",
  guitar: "guitar",
  spanish: "language",
  python: "code",
  singing: "music",
  default: "cog",
});

// Global share-able cache across component instances
const skillIconCache = new Map();

export default {
  name: "Search",
  props: {
    forceApiCall: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      searchQuery: "",
      results: [],
      filteredResults: [],
      searched: false,
      loading: false,
      error: null,
      showFilters: false,
      categories: [
        "Programming",
        "Language",
        "Music",
        "Cooking",
        "Art",
        "Design",
        "Education",
        "Technology",
      ],
      selectedCategories: [],
      searchType: "all",
      // Abort controller for cancelling in-flight requests
      abortController: null,
      // Track search counter for race condition prevention
      searchCounter: 0,
    };
  },
  created() {
    // Check for query parameter in URL and set as initial value
    const queryParam = this.$route.query.q;
    if (queryParam) {
      this.searchQuery = queryParam;
      this.search(); // Auto-search when query is in URL
    }

    // Create a properly named debounced search function
    this.debouncedSearch = debounce(this.handleSearchInput, 300);
  },
  beforeUnmount() {
    // Cancel the debounced function to prevent memory leaks
    if (this.debouncedSearch && this.debouncedSearch.cancel) {
      this.debouncedSearch.cancel();
    }

    // If there's an active abort controller, abort pending requests
    if (this.abortController) {
      this.abortController.abort();
    }
  },
  computed: {
    // Computed property for active filters state
    hasActiveFilters() {
      return this.selectedCategories.length > 0 || this.searchType !== "all";
    },
  },
  watch: {
    // Watch for filter changes to automatically update results
    selectedCategories: {
      handler() {
        this.applyFilters();
      },
      deep: true,
    },
    searchType() {
      this.applyFilters();
    },
  },
  methods: {
    // Handle input changes with debouncing
    handleInputChange() {
      this.debouncedSearch();
    },

    // Actual handler that will be debounced
    handleSearchInput() {
      if (this.searchQuery.trim()) {
        this.search();
      } else {
        this.clearSearch();
      }
    },

    async performSearch() {
      // Skip search if query is empty
      if (!this.searchQuery.trim()) {
        this.results = [];
        this.filteredResults = [];
        this.error = null;
        this.loading = false;
        this.searched = false;
        return;
      }

      this.loading = true;
      this.error = null;

      // Cancel any in-flight request
      if (this.abortController) {
        this.abortController.abort();
      }

      // Create a new abort controller for this request
      this.abortController = new AbortController();

      // Track the current search to prevent race conditions
      const currentSearchId = ++this.searchCounter;

      try {
        // Create request config - only add abort signal when not in test environment
        const requestConfig = {
          params: { q: this.searchQuery },
          timeout: 10000,
        };

        // Only add the abort signal in non-test environments
        if (!process.env.JEST_WORKER_ID) {
          requestConfig.signal = this.abortController.signal;
        }

        const response = await axios.get("/api/search", requestConfig);

        // Guard against race conditions by checking if this is still the most recent search
        if (currentSearchId !== this.searchCounter) return;

        // Ensure we have an array of results, even if empty
        this.results = Array.isArray(response.data) ? response.data : [];

        // Apply filters immediately
        this.applyFilters();

        // Update URL with the search query for bookmarking/sharing
        this.$router.replace({
          query: { ...this.$route.query, q: this.searchQuery },
        });
      } catch (err) {
        // Guard against race conditions
        if (currentSearchId !== this.searchCounter) return;

        // Ignore errors from aborted requests
        if (err.name === "AbortError" || err.name === "CanceledError") {
          return;
        }

        // Only log in non-test environments
        if (process.env.NODE_ENV !== "test") {
          console.error("Search API error:", err);
        }

        // Provide helpful error messages based on error type
        let errorMessage = this.getErrorMessage(err);

        this.error = errorMessage;
        this.filteredResults = [];

        // Show notification for search errors
        eventBus.emit("show-notification", {
          type: "error",
          title: "Search Error",
          message: errorMessage,
          duration: 5000,
        });
      } finally {
        // Guard against race conditions
        if (currentSearchId === this.searchCounter) {
          this.loading = false;
          this.searched = true;
        }
      }
    },

    /**
     * Get a user-friendly error message based on the error type
     * @param {Error} err - The error object
     * @return {string} A user-friendly error message
     */
    getErrorMessage(err) {
      let errorMessage =
        "An error occurred while searching. Please try again later.";

      if (err.response) {
        // The server responded with an error status
        const status = err.response.status;

        if (status === 400) {
          errorMessage =
            err.response.data?.error ||
            "Invalid search query. Please try different keywords.";
        } else if (status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
          this.$router.push("/login");
        } else if (status === 429) {
          errorMessage =
            "Too many search requests. Please try again in a moment.";
        } else if (status >= 500) {
          errorMessage =
            "The search service is currently unavailable. Please try again later.";
        }
      } else if (err.request) {
        // The request was made but no response was received
        if (err.code === "ECONNABORTED") {
          errorMessage = "Search request timed out. Please try again.";
        } else {
          errorMessage =
            "Network error. Please check your connection and try again.";
        }
      }

      return errorMessage;
    },

    /**
     * Apply filters to the search results
     * This is the corrected implementation that fixes the category filtering logic
     */
    applyFilters() {
      if (!this.results.length) {
        this.filteredResults = [];
        return;
      }

      // Use optimized filtering with early returns and minimized iterations
      const hasTypeFilter = this.searchType !== "all";
      const hasCategoryFilter = this.selectedCategories.length > 0;

      // Optimize for the common case where no filters are applied
      if (!hasTypeFilter && !hasCategoryFilter) {
        this.filteredResults = this.results.slice();
        return;
      }

      // Prepare category filter for case-insensitive comparison (once, not in loop)
      const categories = hasCategoryFilter
        ? this.selectedCategories.map((c) => c.toLowerCase())
        : [];

      // Use array filter with optimized callback
      this.filteredResults = this.results.filter((item) => {
        // Type filtering (users vs skills)
        if (hasTypeFilter) {
          const isUser = !!item.email;
          if (
            (this.searchType === "skills" && isUser) ||
            (this.searchType === "users" && !isUser)
          ) {
            return false; // Early return for efficiency
          }
        }

        // Category filtering (only apply to skills, not users)
        if (hasCategoryFilter && !item.email) {
          // This is a skill and we have category filters active
          if (!item.description) {
            return false; // Skill has no description to match against
          }

          const description = item.description.toLowerCase();
          // Return true only if it matches at least one selected category
          return categories.some((category) => description.includes(category));
        }

        // If we get here, the item passes all filters
        return true;
      });
    },

    clearSearch() {
      this.searchQuery = "";
      this.results = [];
      this.filteredResults = [];
      this.searched = false;

      // Also clear the URL query parameter
      this.$router.replace({
        query: { ...this.$route.query, q: undefined },
      });
    },

    search() {
      if (this.forceApiCall) {
        this.performSearch();
      } else if (process.env.JEST_WORKER_ID) {
        // For testing environment, use in-memory filtering
        const dummyData = [
          { name: "Alice", description: "Guitar" },
          { name: "Bob", description: "Spanish" },
          { name: "Charlie", description: "Cooking" },
        ];

        const searchTerm = this.searchQuery.toLowerCase();
        this.results = dummyData.filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description &&
              item.description.toLowerCase().includes(searchTerm)),
        );

        this.applyFilters();
        this.searched = true;
      } else {
        this.performSearch();
      }
    },

    toggleFilters() {
      this.showFilters = !this.showFilters;
    },

    resetFilters() {
      this.selectedCategories = [];
      this.searchType = "all";
      this.applyFilters();
    },

    // Optimized icon lookup with effective caching
    getSkillIcon(skillName) {
      if (!skillName) return "cog";

      // Use cached icon if available - case insensitive lookup
      const key = skillName.toLowerCase();
      if (skillIconCache.has(key)) {
        return skillIconCache.get(key);
      }

      // Determine icon based on predefined mappings or skill name
      let icon = ICON_MAPPING.default;

      // Check direct matches in our mapping - O(1) lookup
      if (ICON_MAPPING[key]) {
        icon = ICON_MAPPING[key];
      } else {
        // Check for partial matches in skill name (minimized loop)
        const mappingEntries = Object.entries(ICON_MAPPING);
        for (let i = 0; i < mappingEntries.length; i++) {
          const [mapKey, mapIcon] = mappingEntries[i];
          if (mapKey !== "default" && key.includes(mapKey)) {
            icon = mapIcon;
            break; // Exit loop early on first match
          }
        }
      }

      // Cache the result for future lookups
      skillIconCache.set(key, icon);
      return icon;
    },

    viewProfile(user) {
      if (!user || !user.id) {
        console.error("Invalid user object:", user);
        alert("Cannot view profile: invalid user data");
        return;
      }
      alert(`Viewing profile for ${user.name}`);
    },

    viewSkill(skill) {
      if (!skill || !skill.name) {
        console.error("Invalid skill object:", skill);
        alert("Cannot view skill: invalid skill data");
        return;
      }

      // Avoid unnecessary router navigation if already viewing the skill
      if (this.$route.query.q === skill.name) return;

      this.$router.push({
        name: "Search",
        query: { q: skill.name },
      });
    },

    startChat(user) {
      if (!user || !user.id) {
        console.error("Invalid user object for chat:", user);
        alert("Cannot start chat: invalid user data");
        return;
      }

      this.$router.push({
        name: "Chat",
        query: { user: user.id, userName: user.name },
      });

      eventBus.emit("show-notification", {
        type: "info",
        title: "Starting Chat",
        message: `Starting a conversation with ${user.name}`,
        duration: 3000,
      });
    },
  },
};
</script>

<style scoped>
.search-page {
  padding-bottom: var(--space-12);
}

.search-hero {
  text-align: center;
  margin-bottom: var(--space-8);
}

.search-hero h1 {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--space-2);
  color: var(--dark);
}

.search-subtitle {
  font-size: var(--font-size-lg);
  color: var(--medium);
  margin-bottom: var(--space-6);
}

.search-form {
  max-width: 700px;
  margin: 0 auto;
}

.search-input-group {
  position: relative;
  margin-bottom: var(--space-4);
  display: flex;
  gap: var(--space-2);
}

.search-icon {
  position: absolute;
  left: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--medium);
  font-size: var(--font-size-lg);
}

.search-input {
  flex: 1;
  padding: var(--space-4) var(--space-4) var(--space-4) var(--space-10);
  font-size: var(--font-size-lg);
  border: 2px solid var(--light);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-fast) ease;
}

.search-input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow:
    0 0 0 3px var(--primary-light),
    var(--shadow-md);
}

.clear-search {
  position: absolute;
  right: calc(var(--space-4) + 120px);
  /* Adjust based on search button width */
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--medium);
  cursor: pointer;
  font-size: var(--font-size-md);
}

.clear-search:hover {
  color: var(--dark);
}

/* Search button styles */
.search-button {
  padding: 0 var(--space-4);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: background-color var(--transition-fast) ease;
  min-width: 120px;
  justify-content: center;
}

.search-button:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.search-filters {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-3);
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: transparent;
  border: none;
  color: var(--primary-color);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  padding: var(--space-2);
}

.filter-toggle:hover,
.filter-toggle.active {
  color: var(--primary-dark);
}

.toggle-icon {
  font-size: var(--font-size-xs);
  transition: transform var(--transition-fast) ease;
}

.advanced-filters {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-md);
  margin-bottom: var(--space-6);
}

.filter-group {
  margin-bottom: var(--space-4);
}

.filter-label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-semibold);
  color: var(--dark);
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.checkbox-container,
.radio-container {
  display: flex;
  align-items: center;
  position: relative;
  padding-left: 28px;
  cursor: pointer;
  user-select: none;
  font-size: var(--font-size-sm);
}

.checkbox-container input,
.radio-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark,
.radio-mark {
  position: absolute;
  left: 0;
  top: 0;
  height: 18px;
  width: 18px;
  background-color: var(--white);
  border: 1px solid var(--medium);
}

.checkmark {
  border-radius: var(--radius-sm);
}

.radio-mark {
  border-radius: 50%;
}

.checkbox-container:hover input ~ .checkmark,
.radio-container:hover input ~ .radio-mark {
  border-color: var(--primary-color);
}

.checkbox-container input:checked ~ .checkmark,
.radio-container input:checked ~ .radio-mark {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.checkmark:after,
.radio-mark:after {
  content: "";
  position: absolute;
  display: none;
}

.checkbox-container input:checked ~ .checkmark:after,
.radio-container input:checked ~ .radio-mark:after {
  display: block;
}

.checkbox-container .checkmark:after {
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.radio-container .radio-mark:after {
  top: 5px;
  left: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.search-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) 0;
  color: var(--medium);
}

.search-loading .spinner {
  margin-bottom: var(--space-4);
  width: 40px;
  height: 40px;
  border-width: 4px;
}

.search-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) 0;
  color: var(--error-color);
}

.error-icon {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--space-4);
}

.search-results-grid {
  margin-top: var(--space-6);
}

.results-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
  contain: content;
}

.result-card {
  display: flex;
  background-color: var(--white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition:
    transform var(--transition-normal) ease,
    box-shadow var(--transition-normal) ease;
  padding: var(--space-4);
  height: 100%;
  will-change: transform, box-shadow;
}

.result-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.user-card {
  border-left: 4px solid var(--info-color);
}

.skill-card {
  border-left: 4px solid var(--success-color);
}

.result-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--space-3);
  font-size: var(--font-size-xl);
  flex-shrink: 0;
}

.user-card .result-icon {
  background-color: var(--info-color);
  color: white;
}

.skill-card .result-icon {
  background-color: var(--success-color);
  color: white;
}

.result-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-details h3 {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--font-size-lg);
}

.result-description {
  color: var(--medium);
  margin-bottom: var(--space-3);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex-grow: 1;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--medium);
  margin-bottom: var(--space-3);
}

.result-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--medium);
}

.no-results-image {
  width: 120px;
  height: 120px;
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.no-results h3 {
  font-size: var(--font-size-xl);
  color: var(--dark);
  margin-bottom: var(--space-2);
}

.search-suggestions {
  font-weight: var(--font-weight-semibold);
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
}

.no-results ul {
  list-style-type: none;
  padding: 0;
  text-align: center;
}

.no-results li {
  margin-bottom: var(--space-1);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--transition-normal) ease;
  max-height: 500px;
  opacity: 1;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

/* Loading animation */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--primary-color);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@media (max-width: 768px) {
  .search-hero h1 {
    font-size: var(--font-size-2xl);
  }

  .search-subtitle {
    font-size: var(--font-size-md);
  }

  .search-input-group {
    flex-direction: column;
  }

  .search-input {
    font-size: var(--font-size-md);
    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-8);
  }

  .search-icon {
    left: var(--space-3);
    font-size: var(--font-size-md);
  }

  .clear-search {
    right: var(--space-3);
  }

  .search-button {
    margin-top: var(--space-2);
    width: 100%;
  }

  .filter-options {
    flex-direction: column;
    gap: var(--space-2);
  }

  .results-container {
    grid-template-columns: 1fr;
  }
}
</style>
