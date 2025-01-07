let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let allActivities = [];

function updateDateTime() {
  const now = new Date();

  // Format time
  const timeElement = document.getElementById("current-time");
  timeElement.textContent =
    now.toLocaleTimeString("en-US", {
      hour12: false,
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
    }) + " UTC";

  // Format date
  const dateElement = document.getElementById("current-date");
  dateElement.textContent = now.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");
  const html = document.documentElement;

  // Load saved theme
  const savedTheme = localStorage.getItem("theme") || "light";
  html.setAttribute("data-theme", savedTheme);

  themeToggle.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function extractUsername(url) {
  const githubUrlPattern = /github\.com\/([^\/]+)(?:\/|$)/;
  const match = url.match(githubUrlPattern);
  return match ? match[1] : null;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function fetchUserData(username, page = 1) {
  try {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Activity-Extension",
    };

    const [userResponse, activitiesResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(
        `https://api.github.com/users/${username}/events?page=${page}&per_page=${ITEMS_PER_PAGE}`,
        { headers },
      ),
    ]);

    if (!userResponse.ok || !activitiesResponse.ok) {
      throw new Error(`Failed to fetch data: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const activities = await activitiesResponse.json();

    // Validate the responses
    if (!userData || !userData.login) {
      throw new Error("Invalid user data received");
    }

    if (!Array.isArray(activities)) {
      return { userData, activities: [] }; // Return empty array if no activities
    }

    return { userData, activities };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

function getActivityIcon(type) {
  const icons = {
    PushEvent: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zm1-6H7V4h2v4zm0 2H7v2h2v-2z"/>
        </svg>`,
    CreateEvent: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zm.75-8.5h-1.5v2.25H5v1.5h2.25V12h1.5V9.75H11v-1.5H8.75z"/>
        </svg>`,
    IssuesEvent: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm9 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-.25-6.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5z"/>
        </svg>`,
    PullRequestEvent: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
        </svg>`,
    WatchEvent: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
        </svg>`,
    ForkEvent: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013 6.25v-.878a2.25 2.25 0 111.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zm-3 8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
        </svg>`,
    default: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.25-11.25v4.5h1.5v-4.5h-1.5zm0 6v1.5h1.5v-1.5h-1.5z"/>
        </svg>`,
  };
  return icons[type] || icons.default;
}

function handleAvatarError() {
  const avatar = document.getElementById("userAvatar");
  avatar.onerror = function () {
    this.src = "icons/icon48.png"; // Fallback to default icon
  };
}

function formatActivity(activity) {
  if (!activity || !activity.type || !activity.repo) {
    return ""; // Skip invalid activities
  }

  const { type, repo, created_at } = activity;
  let description = "";

  try {
    switch (type) {
      case "PushEvent":
        description = `Pushed to ${repo.name}`;
        break;
      case "CreateEvent":
        description = `Created ${activity.payload?.ref_type || "resource"} in ${repo.name}`;
        break;
      case "IssuesEvent":
        description = `${activity.payload?.action || "Updated"} issue in ${repo.name}`;
        break;
      case "PullRequestEvent":
        description = `${activity.payload?.action || "Updated"} pull request in ${repo.name}`;
        break;
      case "WatchEvent":
        description = `Starred ${repo.name}`;
        break;
      case "ForkEvent":
        description = `Forked ${repo.name}`;
        break;
      default:
        description = `Activity in ${repo.name}`;
    }

    return `
            <div class="activity-item">
                <div class="activity-icon">
                    ${getActivityIcon(type)}
                </div>
                <div class="activity-content">
                    <div>${description}</div>
                    <div class="activity-time">${formatDate(created_at)}</div>
                </div>
            </div>
        `;
  } catch (error) {
    console.error("Error formatting activity:", error);
    return ""; // Skip activities that can't be formatted
  }
}

async function loadMoreActivities() {
  const loadMoreButton = document.getElementById("load-more");
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = "Loading...";

  try {
    const username = extractUsername(
      await getCurrentTab().then((tab) => tab.url),
    );
    currentPage++;

    const { activities } = await fetchUserData(username, currentPage);

    if (Array.isArray(activities) && activities.length > 0) {
      allActivities = [...allActivities, ...activities];
      const activitiesContainer = document.getElementById("activities");
      const newActivitiesHTML = activities
        .map((activity) => formatActivity(activity))
        .join("");
      activitiesContainer.innerHTML += newActivitiesHTML;
    }

    // Hide the button if no more activities
    if (activities.length < ITEMS_PER_PAGE) {
      loadMoreButton.style.display = "none";
    } else {
      loadMoreButton.disabled = false;
      loadMoreButton.textContent = "Load More Activities";
    }
  } catch (error) {
    console.error("Error loading more activities:", error);
    loadMoreButton.textContent = "Error Loading More";
    setTimeout(() => {
      loadMoreButton.disabled = false;
      loadMoreButton.textContent = "Try Again";
    }, 2000);
  }
}

async function init() {
  try {
    initThemeToggle();
    updateDateTime();
    setInterval(updateDateTime, 1000);

    const tab = await getCurrentTab();
    const username = extractUsername(tab.url);

    if (!username) {
      document.getElementById("activities").innerHTML =
        '<div class="error">Please navigate to a GitHub user profile</div>';
      return;
    }

    document.getElementById("activities").innerHTML =
      '<div class="loading">Loading activities...</div>';

    const { userData, activities } = await fetchUserData(username);
    allActivities = activities;

    // Update user info
    document.getElementById("username").textContent =
      userData.name || userData.login;
    document.getElementById("login").textContent = `@${userData.login}`;
    document.getElementById("userAvatar").src = userData.avatar_url;

    // Display activities
    if (Array.isArray(activities) && activities.length > 0) {
      const activitiesHTML = activities
        .map((activity) => formatActivity(activity))
        .join("");
      document.getElementById("activities").innerHTML = activitiesHTML;

      // Show load more button if there are activities
      const loadMoreButton = document.getElementById("load-more");
      loadMoreButton.style.display =
        activities.length >= ITEMS_PER_PAGE ? "block" : "none";
      loadMoreButton.addEventListener("click", loadMoreActivities);
    } else {
      document.getElementById("activities").innerHTML =
        '<div class="no-activities">No recent activities found</div>';
    }
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("activities").innerHTML =
      `<div class="error">${error.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
