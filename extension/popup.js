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

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const addTopicBtn = document.getElementById("addTopicBtn");
const dashboardBtn = document.getElementById("dashboardBtn");
const backToHomeBtn = document.getElementById("backToHomeBtn");

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
const stepRows = Array.from(document.querySelectorAll(".step"));
const quizMeta = document.getElementById("quizMeta");
const quizPrompt = document.getElementById("quizPrompt");
const quizOptions = document.getElementById("quizOptions");
const quizAnswerInput = document.getElementById("quizAnswerInput");
const quizFeedback = document.getElementById("quizFeedback");
const quizSubmitBtn = document.getElementById("quizSubmitBtn");
const quizNextBtn = document.getElementById("quizNextBtn");

const API_BASE_URL = "http://localhost:3000/api";

// SM-2 helpers

function sm2GetNextInterval(repetitions, easeFactor, prevInterval, quality) {
  if (quality < 3) return 600000; // 10 min reset
  switch (repetitions) {
    case 0: return 600000; // 10 minutes
    case 1: return 3600000; // 1 hour
    case 2: return 28800000; // 8 hours
    case 3: return 86400000; // 1 day
    default: return Math.round(prevInterval * easeFactor);
  }
}

function sm2Calculate(cardState, quality) {
  let { easeFactor, repetitions, interval, stability } = cardState;

  if (quality >= 3) {
    interval = sm2GetNextInterval(repetitions, easeFactor, interval, quality);
    repetitions += 1;
    stability = stability * (1 + 0.5 * quality / 5);
  } else {
    repetitions = 0;
    interval = 600000;
    stability = Math.max(1, stability * 0.5);
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return {
    easeFactor,
    repetitions,
    interval,
    stability,
    nextReview: new Date(Date.now() + interval).toISOString(),
    lastReviewed: new Date().toISOString(),
    lastQuality: quality,
    qualityHistory: [{ quality, reviewedAt: new Date().toISOString() }],
  };
}

function sm2DefaultState() {
  return {
    easeFactor: 2.5,
    repetitions: 0,
    interval: 600000,
    stability: 1,
    nextReview: new Date().toISOString(),
    lastReviewed: null,
  };
}

async function loadSM2State() {
  const result = await getLocalExtensionStorage(["recallSM2State"]);
  return result.recallSM2State || {};
}

async function saveSM2State(sm2State) {
  await setLocalExtensionStorage({ recallSM2State: sm2State });
}

// IndexedDB Helper
const DB_NAME = "RecallExtensionDB";
const DB_VERSION = 1;
const STORE_NAME = "recallStore";

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveToIndexedDB(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getFromIndexedDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeFromIndexedDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function setLocalExtensionStorage(entries) {
  if (!chrome || !chrome.storage || !chrome.storage.local) {
    return;
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set(entries, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

async function getLocalExtensionStorage(keys) {
  if (!chrome || !chrome.storage || !chrome.storage.local) {
    return {};
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result || {});
    });
  });
}

async function removeLocalExtensionStorage(keys) {
  if (!chrome || !chrome.storage || !chrome.storage.local) {
    return;
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

async function saveWidgetCards(cards) {
  if (!chrome || !chrome.storage || !chrome.storage.local) {
    return;
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ recallWidgetCards: cards || [] }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

async function clearAllIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
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

    console.log(`[API] Success ${path}`);
  }

  return payload;
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
      progressStatus.textContent = "Cards ready.";
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

  showScreen("auth");
}

function updateUserDisplay() {
  if (authState.user) {
    userName.textContent = authState.user.name || "User";
    userEmail.textContent = authState.user.email || "";
  }
}

function navigateToAddTopic() {
  // Clear form
  topicInput.value = "";
  notesInput.value = "";
  examDateInput.value = "";
  clearErrors();
  setSetupStatus("");

  showScreen("setup");
}

async function navigateToDashboard() {
  const token = authState.token || await getFromIndexedDB("recallAuthToken");

  if (!token) {
    authFormError.textContent = "Please login again before opening dashboard.";
    showScreen("auth");
    return;
  }

  const dashboardUrl = `http://localhost:3000/dashboard?token=${encodeURIComponent(token)}`;
  window.open(dashboardUrl, "_blank");
}

function toggleAuthMode() {
  authState.isRegistering = !authState.isRegistering;

  if (authState.isRegistering) {
    authNameField.style.display = "grid";
    authSubmitBtn.textContent = "Register";
    authToggle.textContent = "Already have an account? Login";
  } else {
    authNameField.style.display = "none";
    authSubmitBtn.textContent = "Login";
    authToggle.textContent = "Don't have an account? Register";
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
    await initializeApp();
  } catch (error) {
    authFormError.textContent = error.message || "Authentication failed";
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

    authFormError.textContent = "Opening Google Sign-In...";
    googleAuthBtn.disabled = true;

    // Launch OAuth2 flow to get access token
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      googleAuthBtn.disabled = false;

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
  }
}

async function saveResultToStorage(payload) {
  const promises = Object.entries(payload).map(([key, value]) =>
    saveToIndexedDB(key, value)
  );
  await Promise.all(promises);
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

  if (!card) {
    quizMeta.textContent = 'Done';
    quizPrompt.textContent = 'Quick calibration complete. You are ready to review.';
    quizOptions.innerHTML = '';
    quizAnswerInput.style.display = 'none';
    quizSubmitBtn.textContent = 'Go to Home';
    quizSubmitBtn.disabled = false;
    quizSubmitBtn.onclick = () => {
      finishCalibration();
    };
    quizNextBtn.disabled = true;
    quizFeedback.textContent = '';
    return;
  }

  quizMeta.textContent = `Card ${quizState.currentIndex + 1} of ${quizState.cards.length}`;
  quizFeedback.textContent = "";
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function checkCurrentAnswer() {
  const card = getCurrentCard();
  if (!card || quizState.checked) {
    return;
  }

  let quality = 2; // default: skipped

  if (card.type === "mcq") {
    if (!quizState.selectedOption) {
      quizFeedback.textContent = 'Please choose an option.';
      return;
    }
    const isCorrect =
      normalizeText(quizState.selectedOption) === normalizeText(card.correct);
    quality = isCorrect ? 5 : 1;
    quizFeedback.textContent = isCorrect
      ? 'Correct.'
      : `Not quite. Correct answer: ${card.correct || 'N/A'}`;
  } else if (card.type === "fact") {
    quality = 4;
    quizFeedback.textContent = 'Fact noted. Click Next.';
  } else {
    const typed = normalizeText(quizAnswerInput.value);
    if (!typed) {
      quizFeedback.textContent = 'Please enter an answer.';
      return;
    }
    const isCorrect = typed === normalizeText(card.answer);
    quality = isCorrect ? 5 : 1;
    quizFeedback.textContent = isCorrect
      ? 'Correct.'
      : `Not quite. Correct answer: ${card.answer || 'N/A'}`;
  }

  if (card._id) {
    quizState.results.push({ cardId: card._id, quality });
  }

  quizState.checked = true;
  quizNextBtn.disabled = false;
}

async function finishCalibration() {
  if (!quizState.completionSaved) {
    quizState.completionSaved = true;
    await saveResultToStorage({ recallCalibrationCompleted: true });
  }

  // Load existing SM-2 state (may already have entries from a previous session)
  const sm2State = await loadSM2State();

  // Run SM-2 locally for every answered calibration card
  quizState.results.forEach(({ cardId, quality }) => {
    const existing = sm2State[cardId] || sm2DefaultState();
    sm2State[cardId] = sm2Calculate(existing, quality);
  });

  // Persist updated SM-2 state to chrome.storage.local
  await saveSM2State(sm2State);

  updateUserDisplay();
  showScreen('home');
}

function moveToNextCard() {
  const card = getCurrentCard();
  if (!card) {
    return;
  }

  if (!quizState.checked) {
    checkCurrentAnswer();
  }

  if (!quizState.checked) {
    // Allow users to skip unanswered cards and continue calibration.
    quizFeedback.textContent = "Skipped.";
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

  await saveResultToStorage({
    recallLastSourceId: sourceId,
    recallCards: annotatedCards,
    recallTopic: topic,
    recallExamDate: examDate,
    recallCalibrationCompleted: false,
  });

  await saveWidgetCards(annotatedCards);

  await setLocalExtensionStorage({
    recallExamDate: examDate,
    recallLastSourceId: sourceId,
  });

  initCalibration(cards);
  showScreen("quiz");
}

async function bootstrapFromStoredCards() {
  const { recallCards, recallCalibrationCompleted } = await loadFromStorage([
    "recallCards",
    "recallCalibrationCompleted",
  ]);

  const hasGeneratedCards = Array.isArray(recallCards) && recallCards.length > 0;
  const isCalibrated = Boolean(recallCalibrationCompleted);

  // Sync existing cards to chrome.storage.local for widget access
  if (hasGeneratedCards) {
    await saveWidgetCards(recallCards);
  }

  // Check if there are uncalibrated cards
  if (hasGeneratedCards && !isCalibrated) {
    initCalibration(recallCards);
    showScreen("quiz");
    return;
  }

  // Otherwise, always show home screen after login
  updateUserDisplay();
  showScreen("home");
}

async function initializeApp() {
  const isAuthenticated = await loadAuthToken();

  if (!isAuthenticated) {
    showScreen("auth");
    return;
  }

  await bootstrapFromStoredCards();
}

// Event listeners
authForm.addEventListener("submit", handleAuth);
authToggle.addEventListener("click", toggleAuthMode);
googleAuthBtn.addEventListener("click", handleGoogleAuth);

logoutBtn.addEventListener("click", handleLogout);
addTopicBtn.addEventListener("click", navigateToAddTopic);
dashboardBtn.addEventListener("click", navigateToDashboard);
backToHomeBtn.addEventListener("click", () => {
  updateUserDisplay();
  showScreen("home");
});

quizSubmitBtn.addEventListener("click", checkCurrentAnswer);
quizNextBtn.addEventListener("click", moveToNextCard);

setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  showScreen("progress");

  try {
    await runProgressSimulation();
  } catch (error) {
    showScreen("setup");
    formError.textContent = error.message || "Failed to generate cards";
  }
});

// Initialize app on load
initializeApp();
