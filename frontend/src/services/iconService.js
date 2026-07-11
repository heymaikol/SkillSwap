const iconCache = new Map();

/**
 * fetchDynamicIcon returns a Font Awesome icon name for the given skill.
 * It queries Iconify's API (using the "fa-solid" prefix) and returns a fallback if needed.
 */
export async function fetchDynamicIcon(skillName) {
  if (!skillName) return "cog"; // Default fallback

  const normalizedName = skillName.trim().toLowerCase();

  // Return from cache if available
  if (iconCache.has(normalizedName)) {
    return iconCache.get(normalizedName);
  }

  // ponytail: raw skill name as query; NLP noun extraction dropped with the compromise dep
  const query = skillName;

  let iconName = "cog"; // Default fallback

  try {
    // Fixed template string syntax
    const response = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefix=fa-solid`,
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.results && data.results.length > 0) {
        iconName = data.results[0].icon;
        // Remove any "fa-" prefix for consistency
        if (iconName.startsWith("fa-")) {
          iconName = iconName.substring(3);
        }
      }
    } else {
      console.error("Icon API response not OK:", response.status);
    }
  } catch (error) {
    console.error("Dynamic icon lookup failed:", error);
  }

  // Cache the result
  iconCache.set(normalizedName, iconName);

  return iconName;
}

/**
 * getIconBySkillCategory returns a predefined icon based on skill category
 */
export function getIconBySkillCategory(category) {
  const categoryIcons = {
    programming: "code",
    language: "language",
    music: "music",
    cooking: "utensils",
    art: "palette",
    design: "pen-fancy",
    fitness: "dumbbell",
    business: "briefcase",
    education: "graduation-cap",
    science: "flask",
    technology: "laptop-code",
    writing: "pen-nib",
    photography: "camera",
    sports: "futbol",
    crafts: "tools",
    gaming: "gamepad",
  };

  return categoryIcons[category.toLowerCase()] || "cog";
}

/**
 * getColorBySkillCategory returns a CSS variable name for a category-specific color
 */
export function getColorBySkillCategory(category) {
  const categoryColors = {
    programming: "var(--primary-color)",
    language: "var(--secondary-color)",
    music: "#6b46c1", // purple
    cooking: "#f59e0b", // amber
    art: "#ec4899", // pink
    design: "#0ea5e9", // sky
    fitness: "#10b981", // emerald
    business: "#4b5563", // gray
    education: "#3b82f6", // blue
    science: "#8b5cf6", // violet
    technology: "#2563eb", // blue
    writing: "#14b8a6", // teal
    photography: "#0369a1", // sky
    sports: "#16a34a", // green
    crafts: "#d97706", // amber
    gaming: "#7c3aed", // violet
  };

  return categoryColors[category.toLowerCase()] || "var(--primary-color)";
}
