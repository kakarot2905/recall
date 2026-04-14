const screens = {
  auth: document.getElementById("screenAuth"),
  home: document.getElementById("screenHome"),
  setup: document.getElementById("screenSetup"),
  progress: document.getElementById("screenProgress"),
  quiz: document.getElementById("screenQuiz"),
};

const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authName = document.getElementById("authName");
const authPassword = document.getElementById("authPassword");
const authNameField = document.getElementById("authNameField");
const authEmailError = document.getElementById("authEmailError");
const authNameError = document.getElementById("authNameError");
const authPasswordError = document.getElementById("authPasswordError");
const authFormError = document.getElementById("authFormError");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggle = document.getElementById("authToggle");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const passwordToggle = document.getElementById("passwordToggle");
const eyeIcon = document.getElementById("eyeIcon");
const eyeOffIcon = document.getElementById("eyeOffIcon");

const homeGreeting = document.getElementById("homeGreeting");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userBadgeInitial = document.getElementById("userBadgeInitial");
const logoutBtn = document.getElementById("logoutBtn");
const addTopicBtn = document.getElementById("addTopicBtn");
const dashboardBtn = document.getElementById("dashboardBtn");
const backToHomeBtn = document.getElementById("backToHomeBtn");

const statDue = document.getElementById("statDue");
const statStreak = document.getElementById("statStreak");
const statTotal = document.getElementById("statTotal");
const upcomingList = document.getElementById("upcomingList");
const upcomingCount = document.getElementById("upcomingCount");
const calibrationBanner = document.getElementById("calibrationBanner");
const startCalibrationBtn = document.getElementById("startCalibrationBtn");

const setupForm = document.getElementById("setupForm");
const topicInput = document.getElementById("topicInput");
const notesInput = document.getElementById("notesInput");
const examDateInput = document.getElementById("examDateInput");
const topicError = document.getElementById("topicError");
const notesError = document.getElementById("notesError");
const dateError = document.getElementById("dateError");
const formError = document.getElementById("formError");
const progressStatus = document.getElementById("progressStatus");
const setupStatus = document.getElementById("setupStatus");
const generateBtn = document.getElementById("generateBtn");
const generateBtnText = document.getElementById("generateBtnText");
const aiGenerateBtn = document.getElementById("aiGenerateBtn");
const aiGenerateBtnText = document.getElementById("aiGenerateBtnText");
const aiGenError = document.getElementById("aiGenError");
const lengthSelector = document.getElementById("lengthSelector");
const notesCharCount = document.getElementById("notesCharCount");
const stepRows = Array.from(document.querySelectorAll(".step"));
const quizMeta = document.getElementById("quizMeta");
const quizPrompt = document.getElementById("quizPrompt");
const quizOptions = document.getElementById("quizOptions");
const quizAnswerInput = document.getElementById("quizAnswerInput");
const quizFeedback = document.getElementById("quizFeedback");
const quizSubmitBtn = document.getElementById("quizSubmitBtn");
const quizNextBtn = document.getElementById("quizNextBtn");
const quizProgressBar = document.getElementById("quizProgressBar");
const toastEl = document.getElementById("toast");

const API_BASE_URL = (window.RecallConfig && window.RecallConfig.API_BASE_URL) || "http://localhost:3000/api";
const DASHBOARD_URL = (window.RecallConfig && window.RecallConfig.DASHBOARD_URL) || "http://localhost:3000";

const { sm2Calculate, sm2DefaultState } = window.RecallSM2 || {};
const {
  saveToIndexedDB,
  getFromIndexedDB,
  removeFromIndexedDB,
  clearAllIndexedDB,
  setLocalExtensionStorage,
  getLocalExtensionStorage,
  removeLocalExtensionStorage,
  saveWidgetCards,
} = window.RecallStorage || {};
const { normalizeAnswer, normalizeText, fuzzyMatch } = window.RecallTextUtils || {};

/* ── Toast Notifications ── */
let toastTimerId = null;

function showToast(message, type = "success", durationMs = 2500) {
  if (!toastEl) return;
  if (toastTimerId) { clearTimeout(toastTimerId); toastTimerId = null; }

  toastEl.textContent = message;
  toastEl.className = `toast toast-${type} toast-visible`;

  toastTimerId = setTimeout(() => {
    toastEl.classList.remove("toast-visible");
    toastTimerId = null;
  }, durationMs);
}

/* ── Time-of-day greeting ── */
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/* ── Password Toggle ── */
if (passwordToggle) {
  passwordToggle.addEventListener("click", () => {
    const isPassword = authPassword.type === "password";
    authPassword.type = isPassword ? "text" : "password";
    eyeIcon.style.display = isPassword ? "none" : "block";
    eyeOffIcon.style.display = isPassword ? "block" : "none";
  });
}

/* ── SM-2 State ── */
async function loadSM2State() {
  const result = await getLocalExtensionStorage(["recallSM2State"]);
  return result.recallSM2State || {};
}

async function saveSM2State(sm2State) {
  await setLocalExtensionStorage({ recallSM2State: sm2State });
}

// Debug helper - available globally via console
window.recallDebug = {
  async viewDB() {
    const keys = ["recallAuthToken", "recallUser", "recallGoogleToken", "recallCards", "recallCalibrationCompleted", "recallLastSourceId", "recallTopic", "recallExamDate"];
    const data = {};
    for (const key of keys) {
      data[key] = await getFromIndexedDB(key);
    }
    console.table(data);
    return data;
  },
  async clearDB() {
    await clearAllIndexedDB();
    console.log("✓ IndexedDB cleared");
  }
};

const quizState = {
  cards: [],
  currentIndex: 0,
  selectedOption: "",
  checked: false,
  completionSaved: false,
  results: [],
};

const authState = {
  isRegistering: false,
  token: null,
  user: null,
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => {
    screen.classList.remove("active");
  });
  screens[name].classList.add("active");
}

function clearAuthErrors() {
  authEmailError.textContent = "";
  authNameError.textContent = "";
  authPasswordError.textContent = "";
  authFormError.textContent = "";
}

function clearErrors() {
  topicError.textContent = "";
  notesError.textContent = "";
  dateError.textContent = "";
  formError.textContent = "";
}

function setSetupStatus(statusText = "") {
  setupStatus.textContent = statusText;
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (!topicInput.value.trim()) {
    topicError.textContent = "Topic name is required.";
    valid = false;
  }

  if (!notesInput.value.trim()) {
    notesError.textContent = "Notes are required.";
    valid = false;
  }

  if (!examDateInput.value) {
    dateError.textContent = "Exam date is required.";
    valid = false;
  }

  return valid;
}

function resetStepStates() {
  stepRows.forEach((row) => {
    row.classList.remove("is-on", "is-done");
  });
}

function setStepState(activeIndex, doneUntil) {
  stepRows.forEach((row, index) => {
    if (index === activeIndex) {
      row.classList.add("is-on");
    }
    if (index <= doneUntil) {
      row.classList.add("is-done");
    }
  });
}

async function callApi(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (authState.token && !options.skipAuth) {
    headers.Authorization = `Bearer ${authState.token}`;

    console.log(`[API] ${options.method || 'GET'} ${path}`, {
      hasToken: Boolean(authState.token),
      skipAuth: options.skipAuth
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`[API] Error ${response.status} on ${path}:`, payload);

    if (response.status === 401 && !options.skipAuth) {
      await handleLogout();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error(payload.error || "Request failed");
  }

  console.log(`[API] Success ${path}`);

  return payload;
}

function toTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

async function pullProgressFromServer() {
  try {
    const serverProgress = await callApi('/progress');

    const local = await getLocalExtensionStorage([
      'recallSM2State',
      'ghostCardShown',
      'seenFirstCardPerSource',
    ]);

    const localSm2State = local.recallSM2State || {};
    const serverSm2State = serverProgress?.sm2State || {};
    const mergedSm2State = { ...localSm2State };

    Object.entries(serverSm2State).forEach(([cardId, serverEntry]) => {
      const localEntry = mergedSm2State[cardId];

      if (!localEntry) {
        mergedSm2State[cardId] = serverEntry;
        return;
      }

      const localLastReviewed = toTimestamp(localEntry?.lastReviewed);
      const serverLastReviewed = toTimestamp(serverEntry?.lastReviewed);

      if (localLastReviewed === null) {
        mergedSm2State[cardId] = serverEntry;
        return;
      }

      if (serverLastReviewed === null) {
        return;
      }

      if (serverLastReviewed >= localLastReviewed) {
        mergedSm2State[cardId] = serverEntry;
      }
    });

    const localGhostCardShown = local.ghostCardShown || {};
    const serverGhostCardShown = serverProgress?.ghostCardShown || {};
    const mergedGhostCardShown = {
      ...localGhostCardShown,
      ...serverGhostCardShown,
    };
    Object.keys(mergedGhostCardShown).forEach((key) => {
      mergedGhostCardShown[key] = Boolean(localGhostCardShown[key]) || Boolean(serverGhostCardShown[key]);
    });

    const localSeenFirstCardPerSource = local.seenFirstCardPerSource || {};
    const serverSeenFirstCardPerSource = serverProgress?.seenFirstCardPerSource || {};
    const mergedSeenFirstCardPerSource = {
      ...localSeenFirstCardPerSource,
      ...serverSeenFirstCardPerSource,
    };
    Object.keys(mergedSeenFirstCardPerSource).forEach((key) => {
      mergedSeenFirstCardPerSource[key] = Boolean(localSeenFirstCardPerSource[key]) || Boolean(serverSeenFirstCardPerSource[key]);
    });

    await setLocalExtensionStorage({
      recallSM2State: mergedSm2State,
      ghostCardShown: mergedGhostCardShown,
      seenFirstCardPerSource: mergedSeenFirstCardPerSource,
      recallSyncPending: false,
    });

    console.log('[Sync] Pulled progress from server');
  } catch {
    // Sync is best-effort and must not block user flows.
  }
}

async function pushProgressToServer() {
  try {
    const local = await getLocalExtensionStorage([
      'recallSyncPending',
      'recallSM2State',
      'recallTodayStats',
      'ghostCardShown',
      'seenFirstCardPerSource',
    ]);

    if (!local.recallSyncPending) {
      return;
    }

    await callApi('/progress', {
      method: 'PUT',
      body: JSON.stringify({
        sm2State: local.recallSM2State || {},
        todayStats: local.recallTodayStats ? [local.recallTodayStats] : [],
        ghostCardShown: local.ghostCardShown || {},
        seenFirstCardPerSource: local.seenFirstCardPerSource || {},
      }),
    });

    await setLocalExtensionStorage({
      recallSyncPending: false,
    });

    console.log('[Sync] Pushed progress to server');
  } catch {
    // Sync is best-effort and must not block user flows.
  }
}

async function waitForCompletion(sourceId) {
  const maxAttempts = 120;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { status } = await callApi(`/sources/${sourceId}/status`, {
      method: "GET",
    });

    if (status === "pending") {
      progressStatus.textContent = "Queued for processing...";
      setStepState(0, -1);
    } else if (status === "processing") {
      progressStatus.textContent = "Generating study cards...";
      setStepState(1, 0);
    } else if (status === "done") {
      progressStatus.textContent = "Cards ready!";
      setStepState(-1, 2);
      return;
    } else if (status === "failed") {
      throw new Error("Card generation failed on backend");
    }

    await wait(1500);
  }

  throw new Error("Timed out waiting for backend processing");
}

async function loadAuthToken() {
  let token = await getFromIndexedDB("recallAuthToken");
  let user = await getFromIndexedDB("recallUser");

  // Fallback to extension local storage bridge if IndexedDB is empty.
  if (!token) {
    const local = await getLocalExtensionStorage(["recallAuthToken", "recallUser"]);
    token = local.recallAuthToken;
    user = local.recallUser;

    if (token) {
      await saveToIndexedDB("recallAuthToken", token);
      await saveToIndexedDB("recallUser", user);
    }
  }

  if (token) {
    authState.token = token;
    authState.user = user;
    return true;
  }
  return false;
}

async function saveAuthToken(token, user) {
  authState.token = token;
  authState.user = user;
  await Promise.all([
    saveToIndexedDB("recallAuthToken", token),
    saveToIndexedDB("recallUser", user),
    setLocalExtensionStorage({
      recallAuthToken: token,
      recallUser: user,
    }),
  ]);

  pullProgressFromServer();
}

async function handleLogout() {
  authState.token = null;
  authState.user = null;

  // Check if user logged in via Google and revoke the token
  const googleToken = await getFromIndexedDB("recallGoogleToken");
  if (googleToken && chrome && chrome.identity) {
    try {
      // First, revoke the token with Google
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${googleToken}`);

      // Then remove it from Chrome's cache
      await new Promise((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: googleToken }, () => {
          console.log("Google OAuth token revoked and removed from cache");
          resolve();
        });
      });
    } catch (error) {
      console.error("Error revoking Google token:", error);
    }
  }

  await removeFromIndexedDB("recallAuthToken");
  await removeFromIndexedDB("recallUser");
  await removeFromIndexedDB("recallGoogleToken");
  await removeLocalExtensionStorage([
    "recallAuthToken",
    "recallUser",
    "recallWidgetCards",
  ]);

  showToast("Signed out successfully", "success");
  showScreen("auth");
}

function updateUserDisplay() {
  if (authState.user) {
    const firstName = (authState.user.name || "User").split(/\s+/)[0];
    const greeting = getTimeGreeting();

    homeGreeting.textContent = `${greeting}, ${firstName}!`;
    userName.textContent = authState.user.name || "User";
    userEmail.textContent = authState.user.email || "";

    // Update avatar initial
    const initial = (authState.user.name || authState.user.email || "U").charAt(0).toUpperCase();
    userBadgeInitial.textContent = initial;
  }
}

/* ── Stats Loading ── */
async function loadHomeStats() {
  // Show skeleton state
  [statDue, statStreak, statTotal].forEach(el => el.classList.add("skeleton"));

  try {
    // Load cards and SM-2 state
    const [storedCards, sm2State, todayStats, { recallCalibrationCompleted }] = await Promise.all([
      getFromIndexedDB("recallCards"),
      loadSM2State(),
      getLocalExtensionStorage(["recallTodayStats"]),
      loadFromStorage(["recallCalibrationCompleted"]),
    ]);

    // Show/hide calibration banner
    if (calibrationBanner) {
      if (Array.isArray(storedCards) && storedCards.length > 0 && !recallCalibrationCompleted) {
        calibrationBanner.classList.remove("hidden");
      } else {
        calibrationBanner.classList.add("hidden");
      }
    }

    const cards = Array.isArray(storedCards) ? storedCards : [];
    const now = Date.now();

    // Count due cards
    let dueCount = 0;
    cards.forEach(card => {
      if (!card || !card._id) return;
      const state = sm2State[card._id];
      if (!state || !state.nextReview) { dueCount++; return; }
      if (new Date(state.nextReview).getTime() <= now) { dueCount++; }
    });

    // Get today's streak
    const today = new Date().toISOString().slice(0, 10);
    const stats = todayStats.recallTodayStats;
    const streakCount = (stats && stats.date === today) ? (Number(stats.count) || 0) : 0;

    // Animate numbers in
    animateStatValue(statDue, dueCount);
    animateStatValue(statStreak, streakCount);
    animateStatValue(statTotal, cards.length);

    // Render upcoming cards
    renderUpcomingCards(cards, sm2State);
  } catch {
    statDue.textContent = "–";
    statStreak.textContent = "–";
    statTotal.textContent = "–";
  }

  // Remove skeleton class
  [statDue, statStreak, statTotal].forEach(el => el.classList.remove("skeleton"));
}

function animateStatValue(element, targetValue) {
  const duration = 400;
  const start = performance.now();
  const startVal = parseInt(element.textContent) || 0;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(startVal + (targetValue - startVal) * eased);
    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/* ── Upcoming Cards ── */
function formatRelativeTime(ms) {
  if (ms <= 0) return { text: "Due now", cls: "upcoming-time--now" };

  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);

  if (mins < 1) return { text: "Due now", cls: "upcoming-time--now" };
  if (mins < 60) return { text: `in ${mins}m`, cls: "upcoming-time--soon" };
  if (hrs < 24) return { text: `in ${hrs}h`, cls: "" };
  if (days === 1) return { text: "Tomorrow", cls: "" };
  if (days < 7) return { text: `in ${days}d`, cls: "" };
  return { text: `in ${Math.floor(days / 7)}w`, cls: "" };
}

function renderUpcomingCards(cards, sm2State) {
  if (!upcomingList) return;

  const now = Date.now();

  // Build a list of cards with their next review time
  const upcoming = cards
    .filter(card => card && card._id)
    .map(card => {
      const state = sm2State[card._id];
      const nextReview = state && state.nextReview
        ? new Date(state.nextReview).getTime()
        : now; // cards without SM-2 state are due now
      return { card, nextReview };
    })
    .sort((a, b) => a.nextReview - b.nextReview)
    .slice(0, 5);

  // Update count badge
  if (upcomingCount) {
    upcomingCount.textContent = `${upcoming.length} of ${cards.length}`;
  }

  // Empty state
  if (upcoming.length === 0) {
    upcomingList.innerHTML = `
      <div class="upcoming-empty">
        <div class="upcoming-empty-icon">📚</div>
        No cards yet. Add a topic to get started!
      </div>`;
    return;
  }

  // Render cards
  upcomingList.innerHTML = upcoming.map(({ card, nextReview }) => {
    const diff = nextReview - now;
    const { text: timeText, cls: timeCls } = formatRelativeTime(diff);
    const isDue = diff <= 0;
    const type = card.type || "mcq";
    const question = card.question || card.content || "Untitled card";
    const topic = card.topic || "";
    const typeLabel = type.replace("_", " ");

    return `
      <div class="upcoming-card upcoming-card--${isDue ? 'due' : type}">
        <div class="upcoming-card-body">
          <div class="upcoming-card-question">${escapeHtml(question)}</div>
          <div class="upcoming-card-meta">
            <span class="upcoming-type-badge upcoming-type-badge--${type}">${escapeHtml(typeLabel)}</span>
            ${topic ? `<span class="upcoming-topic">${escapeHtml(topic)}</span>` : ''}
            <span class="upcoming-time ${timeCls}">${timeText}</span>
          </div>
        </div>
      </div>`;
  }).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let selectedNoteLength = "medium";

function updateNotesCharCount() {
  if (notesCharCount) {
    const len = notesInput.value.length;
    notesCharCount.textContent = `${len.toLocaleString()} chars`;
  }
}

function navigateToAddTopic() {
  // Clear form
  topicInput.value = "";
  notesInput.value = "";
  examDateInput.value = "";
  clearErrors();
  if (aiGenError) aiGenError.textContent = "";
  selectedNoteLength = "medium";
  setSetupStatus("Create flash cards from your notes");
  updateNotesCharCount();

  // Reset length pills
  if (lengthSelector) {
    lengthSelector.querySelectorAll(".length-pill").forEach(pill => {
      pill.classList.toggle("is-active", pill.dataset.length === "medium");
    });
  }

  showScreen("setup");
}

/* ── AI Notes Generation ── */
async function handleAiGenerate() {
  const topic = topicInput.value.trim();

  if (!topic) {
    topicError.textContent = "Enter a topic name first";
    topicInput.focus();
    return;
  }

  if (aiGenError) aiGenError.textContent = "";
  aiGenerateBtn.classList.add("btn-loading");
  aiGenerateBtn.disabled = true;

  try {
    const { notes } = await callApi("/generate-notes", {
      method: "POST",
      body: JSON.stringify({
        topic,
        length: selectedNoteLength,
      }),
    });

    if (!notes || !notes.trim()) {
      throw new Error("AI returned empty notes");
    }

    // Typing animation effect
    notesInput.value = "";
    notesInput.classList.add("notes-typing");
    const chunks = notes.match(/.{1,8}/gs) || [notes];
    let charIndex = 0;

    await new Promise((resolve) => {
      const typeInterval = setInterval(() => {
        if (charIndex >= chunks.length) {
          clearInterval(typeInterval);
          notesInput.classList.remove("notes-typing");
          updateNotesCharCount();
          resolve();
          return;
        }
        notesInput.value += chunks[charIndex];
        charIndex++;
        notesInput.scrollTop = notesInput.scrollHeight;
        updateNotesCharCount();
      }, 12);
    });

    showToast(`Notes generated (${selectedNoteLength})! ✨`, "success");
  } catch (error) {
    if (aiGenError) aiGenError.textContent = error.message || "Failed to generate notes";
    showToast("AI generation failed", "error");
  } finally {
    aiGenerateBtn.classList.remove("btn-loading");
    aiGenerateBtn.disabled = false;
  }
}

async function navigateToDashboard() {
  const token = authState.token || await getFromIndexedDB("recallAuthToken");

  if (!token) {
    authFormError.textContent = "Please login again before opening dashboard.";
    showScreen("auth");
    return;
  }

  const dashboardUrl = `${DASHBOARD_URL}/dashboard?token=${encodeURIComponent(token)}`;
  window.open(dashboardUrl, "_blank");
}

function toggleAuthMode() {
  authState.isRegistering = !authState.isRegistering;

  if (authState.isRegistering) {
    authNameField.style.display = "grid";
    authSubmitBtn.textContent = "Create Account";
    authToggle.textContent = "Already have an account? Sign in";
    document.getElementById("authGreeting").textContent = "Create account";
    document.getElementById("authSubtext").textContent = "Start your study journey";
  } else {
    authNameField.style.display = "none";
    authSubmitBtn.textContent = "Sign In";
    authToggle.textContent = "Create an account";
    document.getElementById("authGreeting").textContent = "Welcome back";
    document.getElementById("authSubtext").textContent = "Sign in to continue studying";
  }

  clearAuthErrors();
}

function validateAuthForm() {
  clearAuthErrors();
  let valid = true;

  if (!authEmail.value.trim()) {
    authEmailError.textContent = "Email is required.";
    valid = false;
  }

  if (authState.isRegistering && !authName.value.trim()) {
    authNameError.textContent = "Name is required.";
    valid = false;
  }

  if (!authPassword.value.trim()) {
    authPasswordError.textContent = "Password is required.";
    valid = false;
  } else if (authState.isRegistering && authPassword.value.length < 6) {
    authPasswordError.textContent = "Password must be at least 6 characters.";
    valid = false;
  }

  return valid;
}

async function handleAuth(event) {
  event.preventDefault();

  if (!validateAuthForm()) {
    return;
  }

  // Show loading state
  authSubmitBtn.classList.add("btn-loading");
  authSubmitBtn.disabled = true;

  const endpoint = authState.isRegistering ? "/auth/register" : "/auth/login";
  const body = {
    email: authEmail.value.trim(),
    password: authPassword.value.trim(),
  };

  if (authState.isRegistering) {
    body.name = authName.value.trim();
  }

  try {
    const { token, user } = await callApi(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      skipAuth: true,
    });

    await saveAuthToken(token, user);
    showToast(`Welcome${user.name ? `, ${user.name.split(/\s+/)[0]}` : ''}! 🎉`, "success");
    await initializeApp();
  } catch (error) {
    authFormError.textContent = error.message || "Authentication failed";
  } finally {
    authSubmitBtn.classList.remove("btn-loading");
    authSubmitBtn.disabled = false;
  }
}

async function handleGoogleAuth() {
  try {
    clearAuthErrors();

    // Check if Chrome Identity API is available
    if (!chrome || !chrome.identity) {
      authFormError.textContent = "Google Sign-In is not available in this environment";
      return;
    }

    authFormError.textContent = "";
    googleAuthBtn.disabled = true;
    googleAuthBtn.classList.add("btn-loading");

    // Launch OAuth2 flow to get access token
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      googleAuthBtn.disabled = false;
      googleAuthBtn.classList.remove("btn-loading");

      if (chrome.runtime.lastError) {
        console.error('Chrome identity error:', chrome.runtime.lastError);
        authFormError.textContent = chrome.runtime.lastError.message || "Google Sign-In failed";
        return;
      }

      if (!token) {
        authFormError.textContent = "Failed to get authentication token";
        return;
      }

      try {
        // Get user info from Google using the access token
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`
        );

        if (!userInfoResponse.ok) {
          throw new Error("Failed to fetch user info from Google");
        }

        const userInfo = await userInfoResponse.json();

        // Get ID token by calling tokeninfo endpoint
        const tokenInfoResponse = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
        );

        if (!tokenInfoResponse.ok) {
          throw new Error("Failed to verify token");
        }

        // For backend verification, we need to send the access token directly
        // Backend will verify it with Google
        const { token: jwtToken, user } = await callApi('/auth/google', {
          method: 'POST',
          body: JSON.stringify({
            accessToken: token,
            email: userInfo.email,
            name: userInfo.name,
            googleId: userInfo.sub
          }),
          skipAuth: true
        });

        await saveAuthToken(jwtToken, user);
        // Store Google access token for logout
        await saveToIndexedDB("recallGoogleToken", token);
        showToast(`Welcome, ${user.name ? user.name.split(/\s+/)[0] : 'there'}! 🎉`, "success");
        await initializeApp();

      } catch (error) {
        console.error('Google auth error:', error);
        authFormError.textContent = error.message || "Google authentication failed";

        // Remove the cached token if authentication failed
        chrome.identity.removeCachedAuthToken({ token }, () => {
          console.log('Removed cached token');
        });
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    authFormError.textContent = error.message || "Google authentication failed";
    googleAuthBtn.disabled = false;
    googleAuthBtn.classList.remove("btn-loading");
  }
}

async function saveResultToStorage(payload) {
  const promises = Object.entries(payload).map(([key, value]) =>
    saveToIndexedDB(key, value)
  );
  await Promise.all(promises);
}

function mergeCardsById(existingCards, incomingCards) {
  const merged = new Map();

  (Array.isArray(existingCards) ? existingCards : []).forEach((card) => {
    if (!card) {
      return;
    }

    const cardKey = card._id || `${card.sourceId || ""}:${card.type || ""}:${card.question || card.content || ""}`;
    merged.set(cardKey, card);
  });

  (Array.isArray(incomingCards) ? incomingCards : []).forEach((card) => {
    if (!card) {
      return;
    }

    const cardKey = card._id || `${card.sourceId || ""}:${card.type || ""}:${card.question || card.content || ""}`;
    merged.set(cardKey, card);
  });

  return Array.from(merged.values());
}

async function loadFromStorage(keys) {
  const data = {};
  const promises = keys.map(async (key) => {
    const value = await getFromIndexedDB(key);
    if (value !== undefined) {
      data[key] = value;
    }
  });
  await Promise.all(promises);
  return data;
}

function getCalibrationCards(cards) {
  if (!Array.isArray(cards)) {
    return [];
  }

  const mcqs = cards.filter((card) => card && card.type === 'mcq' && card.question);

  // Fisher-Yates shuffle
  for (let i = mcqs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mcqs[i], mcqs[j]] = [mcqs[j], mcqs[i]];
  }

  return mcqs.slice(0, 5);
}

/* ── Quiz Progress Bar ── */
function renderQuizProgressBar() {
  if (!quizProgressBar) return;
  quizProgressBar.innerHTML = "";

  for (let i = 0; i < quizState.cards.length; i++) {
    const dot = document.createElement("div");
    dot.className = "quiz-progress-dot";

    if (i < quizState.currentIndex) {
      dot.classList.add("is-done");
    } else if (i === quizState.currentIndex) {
      dot.classList.add("is-current");
    }

    quizProgressBar.appendChild(dot);
  }
}

function renderOptionButtons(options) {
  quizOptions.innerHTML = "";

  options.forEach((optionText) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option";
    button.textContent = optionText;

    if (quizState.selectedOption === optionText) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      if (quizState.checked) {
        return;
      }

      quizState.selectedOption = optionText;
      renderCurrentCard();
    });

    quizOptions.appendChild(button);
  });
}

function getCurrentCard() {
  return quizState.cards[quizState.currentIndex] || null;
}

function renderCurrentCard() {
  const card = getCurrentCard();

  renderQuizProgressBar();

  if (!card) {
    quizMeta.textContent = 'Done';
    quizPrompt.textContent = 'Calibration complete. You\'re all set to start reviewing!';
    quizOptions.innerHTML = '';
    quizAnswerInput.style.display = 'none';
    quizSubmitBtn.textContent = 'Go to Home';
    quizSubmitBtn.disabled = false;
    quizSubmitBtn.onclick = () => {
      finishCalibration();
    };
    quizNextBtn.disabled = true;
    quizFeedback.textContent = '';
    quizFeedback.className = '';
    return;
  }

  quizMeta.textContent = `${quizState.currentIndex + 1} / ${quizState.cards.length}`;
  quizFeedback.textContent = "";
  quizFeedback.className = "";
  quizSubmitBtn.textContent = "Check";
  quizSubmitBtn.disabled = false;
  quizSubmitBtn.onclick = null;
  quizNextBtn.disabled = false;

  if (card.type === "mcq") {
    quizPrompt.textContent = card.question || "Choose the correct option.";
    quizAnswerInput.style.display = "none";
    renderOptionButtons(Array.isArray(card.options) ? card.options : []);
  } else if (card.type === "fact") {
    quizPrompt.textContent = card.content || "Read this fact.";
    quizOptions.innerHTML = "";
    quizAnswerInput.style.display = "none";
  } else {
    quizPrompt.textContent = card.question || "Type your answer.";
    quizOptions.innerHTML = "";
    quizAnswerInput.style.display = "block";
    if (!quizState.checked) {
      quizAnswerInput.value = "";
    }
  }
}

async function semanticMatch(question, userAnswer, expectedAnswer) {
  try {
    const response = await fetch(`${API_BASE_URL}/check-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, userAnswer, expectedAnswer }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return !!data.correct;
  } catch {
    return false;
  }
}

async function checkCurrentAnswer() {
  const card = getCurrentCard();
  if (!card || quizState.checked) {
    return;
  }

  let quality = 2; // default: skipped

  if (card.type === "mcq") {
    if (!quizState.selectedOption) {
      quizFeedback.textContent = 'Please choose an option.';
      quizFeedback.className = 'feedback-wrong';
      return;
    }
    const isCorrect =
      normalizeText(quizState.selectedOption) === normalizeText(card.correct);
    quality = isCorrect ? 5 : 1;
    quizFeedback.textContent = isCorrect
      ? '✓ Correct!'
      : `✗ Not quite. Answer: ${card.correct || 'N/A'}`;
    quizFeedback.className = isCorrect ? 'feedback-correct' : 'feedback-wrong';
  } else if (card.type === "fact") {
    quality = 4;
    quizFeedback.textContent = '✓ Fact noted. Click Next.';
    quizFeedback.className = 'feedback-correct';
  } else {
    const typed = normalizeAnswer(quizAnswerInput.value);
    if (!typed) {
      quizFeedback.textContent = 'Please enter an answer.';
      quizFeedback.className = 'feedback-wrong';
      return;
    }
    const correctAns = normalizeAnswer(card.answer || card.correct || "");
    const isCorrect = fuzzyMatch(typed, correctAns)
      || await semanticMatch(card.question || "", typed, correctAns);
    quality = isCorrect ? 5 : 1;
    quizFeedback.textContent = isCorrect
      ? '✓ Correct!'
      : `✗ Not quite. Answer: ${card.answer || 'N/A'}`;
    quizFeedback.className = isCorrect ? 'feedback-correct' : 'feedback-wrong';
  }

  if (card._id) {
    quizState.results.push({ cardId: card._id, quality });

    const sm2Result = await getLocalExtensionStorage(["recallSM2State"]);
    const sm2State = sm2Result.recallSM2State || {};
    const existing = sm2State[card._id] || sm2DefaultState();
    sm2State[card._id] = sm2Calculate(existing, quality);
    await saveSM2State(sm2State);
    await setLocalExtensionStorage({ recallSyncPending: true });
  }

  quizState.checked = true;
  quizNextBtn.disabled = false;
}

async function finishCalibration() {
  if (!quizState.completionSaved) {
    quizState.completionSaved = true;
    await saveResultToStorage({ recallCalibrationCompleted: true });

    // Sync calibration status to backend
    try {
      const { recallLastSourceId } = await loadFromStorage(["recallLastSourceId"]);
      if (recallLastSourceId) {
        const token = await getAuthToken();
        await fetch(`${window.RecallConfig.API_BASE_URL}/sources/${recallLastSourceId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ isCalibrated: true })
        });
      }
    } catch (e) {
      console.error("Failed to sync calibration status", e);
    }
  }

  showToast("Calibration complete! 🎯", "success");
  updateUserDisplay();
  await loadHomeStats();
  showScreen('home');
}

async function moveToNextCard() {
  const card = getCurrentCard();
  if (!card) {
    return;
  }

  if (!quizState.checked) {
    await checkCurrentAnswer();
  }

  if (!quizState.checked) {
    // Allow users to skip unanswered cards and continue calibration.
    quizFeedback.textContent = "Skipped.";
    quizFeedback.className = "";
    quizState.checked = true;
  }

  quizState.currentIndex += 1;
  quizState.selectedOption = "";
  quizState.checked = false;
  renderCurrentCard();
}

function initCalibration(cards) {
  quizState.cards = getCalibrationCards(cards);
  quizState.currentIndex = 0;
  quizState.selectedOption = '';
  quizState.checked = false;
  quizState.completionSaved = false;
  quizState.results = [];
  renderCurrentCard();
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runProgressSimulation() {
  const topic = topicInput.value.trim();
  const notes = notesInput.value.trim();
  const examDate = examDateInput.value;

  resetStepStates();
  progressStatus.textContent = "Submitting your topic...";
  setStepState(0, -1);

  const { sourceId } = await callApi("/sources", {
    method: "POST",
    body: JSON.stringify({ topic, notes, examDate }),
  });

  await waitForCompletion(sourceId);

  progressStatus.textContent = "Fetching cards...";
  const { cards } = await callApi(`/sources/${sourceId}/cards`, {
    method: "GET",
  });

  const annotatedCards = cards.map((c) => ({
    ...c,
    topic,
    sourceId: String(sourceId),
  }));
  const { recallCards: existingCards } = await loadFromStorage(["recallCards"]);
  const mergedCards = mergeCardsById(existingCards, annotatedCards);
  const sm2State = await loadSM2State();

  annotatedCards.forEach((card) => {
    if (!card?._id || sm2State[card._id]) {
      return;
    }

    sm2State[card._id] = {
      ...sm2DefaultState(),
      sourceId: String(sourceId),
    };
  });

  await saveResultToStorage({
    recallLastSourceId: sourceId,
    recallCards: mergedCards,
    recallTopic: topic,
    recallExamDate: examDate,
    recallCalibrationCompleted: false,
  });

  await saveWidgetCards(mergedCards);
  await saveSM2State(sm2State);

  await setLocalExtensionStorage({
    recallExamDate: examDate,
    recallLastSourceId: sourceId,
  });

  showToast(`${cards.length} cards generated! 🃏`, "success");
  initCalibration(cards);
  showScreen("quiz");
}

async function bootstrapFromStoredCards() {
  const { recallCards, recallCalibrationCompleted, recallExamDate, recallLastSourceId } = await loadFromStorage([
    "recallCards",
    "recallCalibrationCompleted",
    "recallExamDate",
    "recallLastSourceId",
  ]);

  const hasGeneratedCards = Array.isArray(recallCards) && recallCards.length > 0;
  const isCalibrated = Boolean(recallCalibrationCompleted);

  // Migrate cards that are missing topic or sourceId annotation
  let cardsToSync = recallCards;
  if (hasGeneratedCards) {
    const storedTopic = await getFromIndexedDB("recallTopic");
    const storedSourceId = await getFromIndexedDB("recallLastSourceId");
    const needsMigration = recallCards.some(
      (c) => !c.topic || !c.sourceId
    );
    if (needsMigration && storedTopic) {
      cardsToSync = recallCards.map((c) => ({
        ...c,
        topic: c.topic || storedTopic,
        sourceId: c.sourceId || String(storedSourceId || ""),
      }));
      await saveToIndexedDB("recallCards", cardsToSync);
    }
  }

  // Sync existing cards to chrome.storage.local for widget access
  if (hasGeneratedCards) {
    await saveWidgetCards(cardsToSync);
  }

  // Keep exam metadata mirrored for widget-only readers even after local storage loss.
  const storageSyncPayload = {};
  if (typeof recallExamDate !== "undefined") {
    storageSyncPayload.recallExamDate = recallExamDate;
  }
  if (typeof recallLastSourceId !== "undefined") {
    storageSyncPayload.recallLastSourceId = recallLastSourceId;
  }
  if (Object.keys(storageSyncPayload).length) {
    await setLocalExtensionStorage(storageSyncPayload);
  }

  // Always show home screen after login and bootstrap
  updateUserDisplay();
  await loadHomeStats();
  showScreen("home");
}

async function initializeApp() {
  const isAuthenticated = await loadAuthToken();

  if (!isAuthenticated) {
    showScreen("auth");
    return;
  }

  pushProgressToServer();

  await bootstrapFromStoredCards();
}

// Event listeners
authForm.addEventListener("submit", handleAuth);
authToggle.addEventListener("click", toggleAuthMode);
googleAuthBtn.addEventListener("click", handleGoogleAuth);

if (startCalibrationBtn) {
  startCalibrationBtn.addEventListener("click", async () => {
    const cards = await getFromIndexedDB("recallCards");
    if (Array.isArray(cards) && cards.length > 0) {
      initCalibration(cards);
      showScreen("quiz");
    }
  });
}

logoutBtn.addEventListener("click", handleLogout);
addTopicBtn.addEventListener("click", navigateToAddTopic);
dashboardBtn.addEventListener("click", navigateToDashboard);
backToHomeBtn.addEventListener("click", () => {
  updateUserDisplay();
  loadHomeStats();
  showScreen("home");
});

quizSubmitBtn.addEventListener("click", checkCurrentAnswer);
quizNextBtn.addEventListener("click", () => moveToNextCard().catch(console.error));

setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  generateBtn.disabled = true;
  generateBtn.classList.add("btn-loading");

  showScreen("progress");

  try {
    await runProgressSimulation();
    generateBtn.disabled = false;
    generateBtn.classList.remove("btn-loading");
  } catch (error) {
    showScreen("setup");
    formError.textContent = error.message || "Failed to generate cards";
    showToast("Generation failed. Please try again.", "error");
    generateBtn.disabled = false;
    generateBtn.classList.remove("btn-loading");
  }
});

// AI generation panel listeners
if (lengthSelector) {
  lengthSelector.addEventListener("click", (e) => {
    const pill = e.target.closest(".length-pill");
    if (!pill) return;

    selectedNoteLength = pill.dataset.length;
    lengthSelector.querySelectorAll(".length-pill").forEach(p => {
      p.classList.toggle("is-active", p === pill);
    });
  });
}

if (aiGenerateBtn) {
  aiGenerateBtn.addEventListener("click", () => handleAiGenerate().catch(console.error));
}

if (notesInput) {
  notesInput.addEventListener("input", updateNotesCharCount);
}

// Initialize app on load
initializeApp();

