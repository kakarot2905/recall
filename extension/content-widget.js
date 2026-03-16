(() => {
  const WIDGET_ID = "recall-card-widget";
  const WIDGET_DOT_ID = "recall-card-widget-dot";
  const STORAGE_KEY = "recallWidgetCards";
  const POSITION_STORAGE_KEY = "recallWidgetPosition";
  const DOT_POSITION_STORAGE_KEY = "recallWidgetDotPosition";
  const DND_MODE_STORAGE_KEY = "recallWidgetDndMode";
  const IDLE_THRESHOLD_MS = 5000;
  const IDLE_CHECK_MS = 500;
  const DASHBOARD_SYNC_EVENT = "RECALL_SYNC_WIDGET_CARDS";

  function hashTopicColor(topic) {
    let hash = 5381;
    const value = String(topic || "");

    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) + hash) + value.charCodeAt(index);
    }

    const hue = Math.abs(hash) % 361;
    return `hsl(${hue}, 55%, 68%)`;
  }

  function getTimeOfDay() {
    const hour = new Date().getHours();

    if (hour <= 8) {
      return "early";
    }

    if (hour >= 22) {
      return "late";
    }

    return "day";
  }

  function getDaysUntilExam(examDate) {
    if (!examDate) {
      return null;
    }

    const examTimestamp = new Date(examDate).getTime();
    if (Number.isNaN(examTimestamp)) {
      return null;
    }

    return Math.ceil((examTimestamp - Date.now()) / 86400000);
  }

  function loadSM2StateLocal() {
    return new Promise((resolve) => {
      if (!isChromeStorageAvailable()) {
        resolve({});
        return;
      }

      safeStorageGet(["recallSM2State"], {}, (result) => {
        resolve(result.recallSM2State || {});
      });
    });
  }

  function getTodayAnsweredCount() {
    return new Promise((resolve) => {
      if (!isChromeStorageAvailable()) {
        resolve(0);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      safeStorageGet(["recallTodayStats"], {}, (result) => {
        const stats = result.recallTodayStats;
        if (!stats || stats.date !== today) {
          resolve(0);
          return;
        }

        resolve(Number(stats.count) || 0);
      });
    });
  }

  function incrementTodayAnsweredCount() {
    return new Promise((resolve) => {
      if (!isChromeStorageAvailable()) {
        resolve();
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      safeStorageGet(["recallTodayStats"], {}, (result) => {
        const stats = result.recallTodayStats;
        const nextCount = stats && stats.date === today ? (Number(stats.count) || 0) + 1 : 1;

        safeStorageSet({
          recallTodayStats: {
            date: today,
            count: nextCount,
          },
        }, () => {
          resolve();
        });
      });
    });
  }

  let cards = [];
  let allCardsForLogging = [];
  let sm2State = {}; // SM-2 state map keyed by cardId
  let index = 0;
  let idleTimerId = null;
  let idleTriggered = false;
  let lastUserActivityAt = Date.now();
  let isWidgetVisible = false;
  let cardState = {}; // Track answered state for cards
  let currentCardInteracted = false;
  let isDndMode = false;
  let isDndPreview = false;
  let hasInvalidatedContext = false;
  let storageChangeListener = null;
  let pendingWrongAnswer = false;
  let firstCorrectFiredThisSession = false;
  let sessionGiveUpCount = 0;
  let sessionGiveUpHourTriggered = false;
  let lastIdleTriggerAt = null;
  let lastAnswerWasCorrect = false;
  let completedQueueCardKeys = new Set();
  let queueCompleted = false;
  let dueQueueRefreshTimerId = null;
  let widgetRevealWidthTimerId = null;
  let widgetRevealHeightTimerId = null;
  let widgetRevealFinalizeTimerId = null;

  // SM-2 helpers (client-side, no network)

  function widgetSM2GetNextInterval(repetitions, easeFactor, prevInterval, quality) {
    if (quality < 3) return 600000;
    switch (repetitions) {
      case 0: return 600000;
      case 1: return 3600000;
      case 2: return 28800000;
      case 3: return 86400000;
      default: return Math.round(prevInterval * easeFactor);
    }
  }

  function widgetSM2Calculate(cardState, quality) {
    let { easeFactor, repetitions, interval, stability } = cardState;
    const reviewedAt = new Date().toISOString();
    const qualityHistory = Array.isArray(cardState.qualityHistory)
      ? cardState.qualityHistory.slice(-9)
      : [];

    if (quality >= 3) {
      interval = widgetSM2GetNextInterval(repetitions, easeFactor, interval, quality);
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
      lastQuality: quality,
      qualityHistory: [
        ...qualityHistory,
        {
          quality,
          reviewedAt,
        },
      ],
      nextReview: new Date(Date.now() + interval).toISOString(),
      lastReviewed: reviewedAt,
    };
  }

  function widgetSM2Default() {
    return {
      easeFactor: 2.5,
      repetitions: 0,
      interval: 600000,
      stability: 1,
      nextReview: new Date().toISOString(),
      lastReviewed: null,
    };
  }

  function widgetGetDueCards(cards, sm2State) {
    const now = Date.now();
    return cards.filter((card) => {
      const state = sm2State[card._id];
      // No SM-2 state yet means card is due immediately
      if (!state || !state.nextReview) return true;
      return new Date(state.nextReview).getTime() <= now;
    });
  }

  function getQueueCardKey(card, fallbackIndex) {
    if (!card) {
      return `unknown-${fallbackIndex}`;
    }

    return card._id || `${card.type || "card"}:${card.sourceId || "unknown"}:${fallbackIndex}`;
  }

  function hideWidgetUntilQueueRefresh() {
    const widget = document.getElementById(WIDGET_ID);
    if (widget) {
      resetWidgetRevealState(widget);
    }
    isWidgetVisible = false;
    setDotVisible(false);
  }

  function clearDueQueueRefreshTimer() {
    if (!dueQueueRefreshTimerId) {
      return;
    }

    window.clearTimeout(dueQueueRefreshTimerId);
    dueQueueRefreshTimerId = null;
  }

  function scheduleDueQueueRefresh() {
    clearDueQueueRefreshTimer();

    if (!allCardsForLogging.length) {
      return;
    }

    const now = Date.now();
    let nextDueDelayMs = Infinity;

    allCardsForLogging.forEach((card) => {
      if (!card || !card._id) {
        return;
      }

      const nextReviewAt = sm2State[card._id]?.nextReview;
      if (!nextReviewAt) {
        nextDueDelayMs = 0;
        return;
      }

      const nextReviewMs = new Date(nextReviewAt).getTime();
      if (Number.isNaN(nextReviewMs)) {
        return;
      }

      const delayMs = nextReviewMs - now;
      if (delayMs < nextDueDelayMs) {
        nextDueDelayMs = delayMs;
      }
    });

    if (!Number.isFinite(nextDueDelayMs)) {
      return;
    }

    const delay = Math.max(500, Math.min(Math.max(0, nextDueDelayMs) + 200, 60000));
    dueQueueRefreshTimerId = window.setTimeout(() => {
      dueQueueRefreshTimerId = null;
      setCards(allCardsForLogging);
      applyDndModeUi();
    }, delay);
  }

  function advanceToNextUnansweredCard() {
    if (!cards.length) {
      return false;
    }

    const currentKey = getQueueCardKey(cards[index], index);
    completedQueueCardKeys.add(currentKey);

    let nextIndex = -1;
    for (let offset = 1; offset <= cards.length; offset += 1) {
      const candidateIndex = (index + offset) % cards.length;
      const candidateKey = getQueueCardKey(cards[candidateIndex], candidateIndex);
      if (!completedQueueCardKeys.has(candidateKey)) {
        nextIndex = candidateIndex;
        break;
      }
    }

    cardState = {};
    currentCardInteracted = false;
    pendingWrongAnswer = false;

    if (nextIndex === -1) {
      queueCompleted = true;
      hideWidgetUntilQueueRefresh();
      console.log("[Recall Widget] Queue completed. Waiting for refreshed cards.");
      return false;
    }

    index = nextIndex;
    return true;
  }

  function moveCardToFront(cardsList, predicate) {
    const foundCard = cardsList.find(predicate);
    if (!foundCard) {
      return cardsList.slice();
    }

    return [foundCard, ...cardsList.filter((card) => card !== foundCard)];
  }

  async function getCardsForCurrentContext(allCards) {
    const safeCards = Array.isArray(allCards)
      ? allCards.filter((card) => card && (card.question || card.content))
      : [];

    if (!safeCards.length) {
      return [];
    }

    const now = new Date();
    const hour = now.getHours();

    if (sessionGiveUpCount >= 3 && (hour === 23 || hour === 0) && !sessionGiveUpHourTriggered) {
      sessionGiveUpHourTriggered = true;
      return safeCards.filter((card) => card.type === "fact");
    }

    const contextData = await new Promise((resolve) => {
      safeStorageGet(["recallLastOpenedAt", "recallSM2State"], {}, (result) => {
        resolve({
          lastOpenedAt: result.recallLastOpenedAt,
          sm2StateMap: result.recallSM2State || sm2State || {},
        });
      });
    });

    const lastOpenedAt = Number(contextData.lastOpenedAt) || 0;
    if (lastOpenedAt && (Date.now() - lastOpenedAt > 4 * 86400000)) {
      return moveCardToFront(safeCards, (card) => card.type === "fact");
    }

    if (hour < 9) {
      return safeCards.slice().sort((leftCard, rightCard) => {
        const leftDifficulty = Number(leftCard.difficulty) || 0;
        const rightDifficulty = Number(rightCard.difficulty) || 0;

        const leftRank = leftDifficulty >= 4 ? 2 : (leftDifficulty >= 2 ? 0 : 1);
        const rightRank = rightDifficulty >= 4 ? 2 : (rightDifficulty >= 2 ? 0 : 1);

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return leftDifficulty - rightDifficulty;
      });
    }

    if (now.getDay() === 0) {
      const sevenDaysAgo = Date.now() - (7 * 86400000);
      const lowRecentQualityCardIds = new Set(
        Object.entries(contextData.sm2StateMap || {})
          .filter(([, state]) => Array.isArray(state?.qualityHistory) && state.qualityHistory.some((entry) => {
            const reviewedAt = new Date(entry?.reviewedAt || 0).getTime();
            return reviewedAt >= sevenDaysAgo && Number(entry?.quality) <= 3;
          }))
          .map(([cardId]) => cardId)
      );

      return safeCards.slice().sort((leftCard, rightCard) => {
        const leftPriority = lowRecentQualityCardIds.has(leftCard._id) ? 0 : 1;
        const rightPriority = lowRecentQualityCardIds.has(rightCard._id) ? 0 : 1;
        return leftPriority - rightPriority;
      });
    }

    return safeCards;
  }

  function widgetSubmitReview(cardId, quality, sourceId) {
    if (!isChromeStorageAvailable()) return;

    safeStorageGet(["recallSM2State", "recallLastReviewedAt"], {}, (result) => {
      const storedSM2State = result.recallSM2State || {};
      const lastReviewedAt = result.recallLastReviewedAt || {};
      const existing = storedSM2State[cardId] || widgetSM2Default();
      storedSM2State[cardId] = widgetSM2Calculate(existing, quality);
      sm2State[cardId] = storedSM2State[cardId];
      if (sourceId) {
        storedSM2State[cardId].sourceId = sourceId;
        sm2State[cardId].sourceId = sourceId;
      }

      const storagePayload = { recallSM2State: storedSM2State };
      if (sourceId) {
        storagePayload.recallLastSourceId = sourceId;
        storagePayload.recallLastReviewedAt = {
          ...lastReviewedAt,
          [sourceId]: Date.now(),
        };
      }

      safeStorageSet(storagePayload, (didSave) => {
        if (!didSave) {
          console.error("[Recall Widget] Failed to save SM-2 state");
          return;
        }
        incrementTodayAnsweredCount();
        console.log(`[Recall Widget] SM-2 updated for card ${cardId}, quality ${quality}, nextReview: ${storedSM2State[cardId].nextReview}`);
        logAllCardIntervals(allCardsForLogging, sm2State);
      });
    });
  }

  function logAllCardIntervals(cardsList, sm2StateMap) {
    const safeCards = Array.isArray(cardsList)
      ? cardsList.filter((card) => card && (card.question || card.content))
      : [];

    if (!safeCards.length) {
      console.log("[Recall Widget] No cards available for interval logging.");
      return;
    }

    const now = Date.now();
    const rows = safeCards.map((card, idx) => {
      const cardId = card._id || `unknown-${idx}`;
      const state = (sm2StateMap && sm2StateMap[cardId]) || null;
      const intervalMs = Number(state?.interval) || 0;
      const nextReviewAt = state?.nextReview || null;
      const msUntilReview = nextReviewAt ? (new Date(nextReviewAt).getTime() - now) : null;
      return {
        cardId,
        hasSm2State: Boolean(state),
        intervalMs,
        intervalMinutes: Math.round(intervalMs / 60000),
        nextReview: nextReviewAt,
        minutesUntilReview: msUntilReview == null ? null : Math.round(msUntilReview / 60000),
      };
    }).sort((leftRow, rightRow) => {
      const leftMinutes = leftRow.minutesUntilReview;
      const rightMinutes = rightRow.minutesUntilReview;

      if (leftMinutes == null && rightMinutes == null) return 0;
      if (leftMinutes == null) return 1;
      if (rightMinutes == null) return -1;
      return leftMinutes - rightMinutes;
    });

    console.table(rows);
  }

  function normalizeAnswer(text) {
    return text.toLowerCase().trim();
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i += 1) {
      dp[i][0] = i;
    }

    for (let j = 0; j <= n; j += 1) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }

    return dp[m][n];
  }

  function fuzzyMatch(userAns, correctAns) {
    const a = normalizeAnswer(userAns || "");
    const b = normalizeAnswer(correctAns || "");

    if (!a || !b) {
      return false;
    }

    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    const similarity = 1 - (dist / maxLen);
    return similarity >= 0.8;
  }

  async function semanticMatch(question, userAnswer, expectedAnswer) {
    try {
      const response = await fetch("http://localhost:3000/api/check-answer", {
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

  function lerpColor(from, to, t) {
    const normalizedT = Math.min(Math.max(t, 0), 1);
    const parseHex = (hex) => {
      const sanitized = hex.replace("#", "");
      const normalizedHex = sanitized.length === 3
        ? sanitized.split("").map((char) => char + char).join("")
        : sanitized;

      return {
        r: parseInt(normalizedHex.slice(0, 2), 16),
        g: parseInt(normalizedHex.slice(2, 4), 16),
        b: parseInt(normalizedHex.slice(4, 6), 16),
      };
    };

    const fromRgb = parseHex(from);
    const toRgb = parseHex(to);
    const r = Math.round(fromRgb.r + ((toRgb.r - fromRgb.r) * normalizedT));
    const g = Math.round(fromRgb.g + ((toRgb.g - fromRgb.g) * normalizedT));
    const b = Math.round(fromRgb.b + ((toRgb.b - fromRgb.b) * normalizedT));

    return `rgb(${r}, ${g}, ${b})`;
  }

  function fireParticleBurst(widget) {
    if (!widget) {
      return;
    }

    const burstLayer = document.createElement("div");
    burstLayer.style.position = "absolute";
    burstLayer.style.inset = "0";
    burstLayer.style.pointerEvents = "none";
    burstLayer.style.overflow = "visible";
    burstLayer.style.zIndex = "2";

    const originX = widget.offsetWidth / 2;
    const originY = 26;

    for (let index = 0; index < 7; index += 1) {
      const particle = document.createElement("div");
      const angle = (Math.PI * 2 * index) / 7;
      const distance = 30 + (index % 3) * 10;

      particle.style.position = "absolute";
      particle.style.left = `${originX}px`;
      particle.style.top = `${originY}px`;
      particle.style.width = "6px";
      particle.style.height = "6px";
      particle.style.marginLeft = "-3px";
      particle.style.marginTop = "-3px";
      particle.style.borderRadius = "50%";
      particle.style.background = "#C5BAFF";
      particle.style.opacity = "1";

      burstLayer.appendChild(particle);
      particle.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.5)`,
          opacity: 0,
        },
      ], {
        duration: 400,
        easing: "ease-out",
        fill: "forwards",
      });
    }

    widget.appendChild(burstLayer);
    window.setTimeout(() => {
      burstLayer.remove();
    }, 420);
  }

  function maybeFireFirstCorrectBurst(widget) {
    if (firstCorrectFiredThisSession) {
      return;
    }

    firstCorrectFiredThisSession = true;
    fireParticleBurst(widget);
  }

  async function injectGhostCardIfNeeded(cardsList, sourceId) {
    const safeCards = Array.isArray(cardsList) ? cardsList.slice() : [];
    if (!sourceId) {
      return safeCards;
    }

    const storageState = await new Promise((resolve) => {
      safeStorageGet(["recallExamDate", "ghostCardShown", "recallSM2State"], {}, (result) => {
        resolve(result || {});
      });
    });

    const daysUntil = getDaysUntilExam(storageState.recallExamDate || null);
    if (daysUntil !== 1) {
      return safeCards;
    }

    const ghostCardShown = storageState.ghostCardShown || {};
    if (ghostCardShown[sourceId]) {
      return safeCards;
    }

    const sourceCardsCount = Object.values(storageState.recallSM2State || {}).filter((state) => state?.sourceId === sourceId).length
      || safeCards.filter((card) => card?.sourceId === sourceId).length;

    const ghostCard = {
      type: "ghost",
      content: `You've reviewed ${sourceCardsCount} cards for this. You're ready.`,
      _id: `ghost-eve-${sourceId}`,
      sourceId,
    };

    await new Promise((resolve) => {
      safeStorageSet({
        ghostCardShown: {
          ...ghostCardShown,
          [sourceId]: true,
        },
      }, () => resolve());
    });

    return [ghostCard, ...safeCards];
  }

  function triggerDndSilencePulseOnce() {
    const dot = document.getElementById(WIDGET_DOT_ID);
    if (!dot || typeof dot.animate !== "function") {
      return;
    }

    dot.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.3)", offset: 0.5 },
      { transform: "scale(1)" },
    ], {
      duration: 600,
      easing: "ease-in-out",
      iterations: 1,
      fill: "none",
    });
  }

  async function getEntryAnimation() {
    const today = new Date().toISOString().slice(0, 10);
    const lastShownDate = await new Promise((resolve) => {
      safeStorageGet(["recallLastShownDate"], {}, (result) => {
        resolve(result.recallLastShownDate || null);
      });
    });

    if (lastShownDate !== today) {
      safeStorageSet({ recallLastShownDate: today });
      return {
        keyframe: "@keyframes recallWidgetEntryFade { 0% { opacity: 0; } 100% { opacity: 1; } }",
        style: {
          animation: "recallWidgetEntryFade 400ms ease 1",
        },
      };
    }

    if (lastIdleTriggerAt && (Date.now() - lastIdleTriggerAt > 30 * 60000)) {
      return {
        keyframe: "@keyframes recallWidgetEntryDrop { 0% { transform: translateY(-12px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }",
        style: {
          animation: "recallWidgetEntryDrop 350ms ease-out 1",
        },
      };
    }

    if (lastAnswerWasCorrect) {
      lastAnswerWasCorrect = false;
      return {
        keyframe: "@keyframes recallWidgetEntryBounce { 0% { transform: translateY(-4px); } 100% { transform: translateY(0); } }",
        style: {
          animation: "recallWidgetEntryBounce 300ms cubic-bezier(0.34,1.56,0.64,1) 1",
        },
      };
    }

    return {
      keyframe: "@keyframes recallWidgetEntrySlide { 0% { transform: translateX(12px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }",
      style: {
        animation: "recallWidgetEntrySlide 250ms ease 1",
      },
    };
  }

  function getReviewQualityHistory(cardId) {
    const state = cardId ? sm2State[cardId] : null;
    if (!state) {
      return [];
    }

    if (Array.isArray(state.qualityHistory) && state.qualityHistory.length) {
      return state.qualityHistory;
    }

    return state.lastQuality == null ? [] : [{ quality: state.lastQuality }];
  }

  function applySeenBeforeHint(promptElement, cardId) {
    const state = cardId ? sm2State[cardId] : null;
    const qualityHistory = getReviewQualityHistory(cardId);
    const hasConfidentHistory = Number(state?.repetitions) >= 3
      && qualityHistory.length > 0
      && qualityHistory.every((entry) => Number(entry?.quality) >= 4);

    promptElement.style.fontWeight = hasConfidentHistory ? "450" : "400";
  }

  function getRecallUserFirstName(user) {
    if (!user) {
      return "there";
    }

    if (typeof user.firstName === "string" && user.firstName.trim()) {
      return user.firstName.trim();
    }

    if (typeof user.name === "string" && user.name.trim()) {
      return user.name.trim().split(/\s+/)[0];
    }

    if (typeof user.email === "string" && user.email.includes("@")) {
      return user.email.split("@")[0];
    }

    return "there";
  }

  function decoratePromptAndWidget(promptElement, baseText, card, currentIndex, widget) {
    if (!promptElement || !widget || !card) {
      return;
    }

    applySeenBeforeHint(promptElement, card._id);

    safeStorageGet(["recallUser", "seenFirstCardPerSource", "recallTopicColors"], {}, (result) => {
      if (!promptElement.isConnected) {
        return;
      }

      const topicColors = result.recallTopicColors || {};
      const topicName = card.topic || card.sourceName || card.sourceId || "this topic";
      const topicColor = topicColors[card.sourceId]
        || topicColors[topicName]
        || hashTopicColor(card.topic || card.sourceId || topicName);

      widget.style.borderLeft = `3px solid ${topicColor}`;

      const seenFirstCardPerSource = result.seenFirstCardPerSource || {};
      const sourceId = card.sourceId;
      const isNewSourceIntro = Boolean(sourceId) && currentIndex === 0 && !seenFirstCardPerSource[sourceId];

      if (isNewSourceIntro) {
        const firstName = getRecallUserFirstName(result.recallUser);
        promptElement.textContent = `Let's see what you know about ${topicName}, ${firstName}. ${baseText}`;

        safeStorageSet({
          seenFirstCardPerSource: {
            ...seenFirstCardPerSource,
            [sourceId]: true,
          },
        });
        return;
      }

      promptElement.textContent = baseText;
    });
  }

  function animateAdvanceToNextCard(widget, cardId, wasCorrect, quality) {
    const body = widget?.querySelector(`#${WIDGET_ID}-body`);
    const speed = parseFloat(widget?.style.getPropertyValue("--recall-anim-speed") || "1") || 1;
    const durationMs = Math.round(300 * speed);
    const currentReps = Number((cardId ? sm2State[cardId]?.repetitions : null) ?? 0);
    const useMasteredExit = wasCorrect && quality >= 3 && (currentReps + 1) >= 5;

    const advance = () => {
      if (body) {
        body.style.transition = "";
        body.style.transform = "";
        body.style.opacity = "";
      }

      const hasNextCard = advanceToNextUnansweredCard();
      if (!hasNextCard) {
        return;
      }

      renderCurrentCard();
    };

    if (!body || !cards.length) {
      advance();
      return;
    }

    body.style.transition = useMasteredExit
      ? `transform ${0.3 * speed}s ease-in, opacity ${0.3 * speed}s ease-in`
      : `transform ${0.3 * speed}s ease-in, opacity ${0.3 * speed}s`;
    body.style.transform = useMasteredExit ? "scale(0)" : "translateX(60px)";
    body.style.opacity = "0";

    window.setTimeout(advance, durationMs);
  }

  function isContextInvalidationError(error) {
    return Boolean(
      error
      && typeof error.message === "string"
      && error.message.includes("Extension context invalidated")
    );
  }

  function handleExtensionContextInvalidated(error) {
    if (hasInvalidatedContext) {
      return;
    }

    hasInvalidatedContext = true;
    if (idleTimerId) {
      clearInterval(idleTimerId);
      idleTimerId = null;
    }

    console.warn("[Recall Widget] Extension context invalidated. Widget automation disabled until the page reloads.", error);
  }

  function isExtensionContextValid() {
    if (hasInvalidatedContext) {
      return false;
    }

    try {
      return Boolean(
        typeof chrome !== "undefined"
        && chrome.runtime
        && chrome.runtime.id
        && chrome.storage
        && chrome.storage.local
      );
    } catch (error) {
      if (isContextInvalidationError(error)) {
        handleExtensionContextInvalidated(error);
      }
      return false;
    }
  }

  function getChromeRuntimeError() {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.lastError) {
        return null;
      }

      const error = new Error(chrome.runtime.lastError.message || "Chrome runtime error");
      if (isContextInvalidationError(error)) {
        handleExtensionContextInvalidated(error);
      }

      return error;
    } catch (error) {
      if (isContextInvalidationError(error)) {
        handleExtensionContextInvalidated(error);
      }
      return error;
    }
  }

  function safeStorageGet(keys, fallbackValue, callback) {
    if (!isExtensionContextValid()) {
      callback(fallbackValue);
      return;
    }

    try {
      chrome.storage.local.get(keys, (result) => {
        const runtimeError = getChromeRuntimeError();
        if (runtimeError) {
          callback(fallbackValue);
          return;
        }

        callback(result || fallbackValue);
      });
    } catch (error) {
      if (isContextInvalidationError(error)) {
        handleExtensionContextInvalidated(error);
      }
      callback(fallbackValue);
    }
  }

  function safeStorageSet(items, callback) {
    const onComplete = typeof callback === "function" ? callback : () => { };

    if (!isExtensionContextValid()) {
      onComplete(false);
      return;
    }

    try {
      chrome.storage.local.set(items, () => {
        const runtimeError = getChromeRuntimeError();
        if (runtimeError) {
          onComplete(false);
          return;
        }

        onComplete(true);
      });
    } catch (error) {
      if (isContextInvalidationError(error)) {
        handleExtensionContextInvalidated(error);
      }
      onComplete(false);
    }
  }

  function isChromeStorageAvailable() {
    return isExtensionContextValid();
  }

  function clampPosition(left, top, width, height) {
    const maxLeft = Math.max(window.innerWidth - width, 0);
    const maxTop = Math.max(window.innerHeight - height, 0);

    return {
      left: Math.min(Math.max(left, 0), maxLeft),
      top: Math.min(Math.max(top, 0), maxTop),
    };
  }

  function applyWidgetPosition(wrapper, left, top) {
    const clamped = clampPosition(left, top, wrapper.offsetWidth, wrapper.offsetHeight);
    wrapper.style.left = `${clamped.left}px`;
    wrapper.style.top = `${clamped.top}px`;
    wrapper.style.right = "auto";
  }

  function persistWidgetPosition(wrapper) {
    if (!isChromeStorageAvailable()) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const clamped = clampPosition(rect.left, rect.top, wrapper.offsetWidth, wrapper.offsetHeight);
    safeStorageSet({
      [POSITION_STORAGE_KEY]: {
        left: clamped.left,
        top: clamped.top,
      },
    });
  }

  function restoreWidgetPosition(wrapper) {
    if (!isChromeStorageAvailable()) {
      return;
    }

    safeStorageGet([POSITION_STORAGE_KEY], {}, (result) => {
      const saved = result[POSITION_STORAGE_KEY];
      if (!saved || typeof saved.left !== "number" || typeof saved.top !== "number") {
        return;
      }

      applyWidgetPosition(wrapper, saved.left, saved.top);
    });
  }

  function persistDotPosition(dot) {
    if (!isChromeStorageAvailable()) {
      return;
    }

    const rect = dot.getBoundingClientRect();
    const clamped = clampPosition(rect.left, rect.top, dot.offsetWidth || 12, dot.offsetHeight || 12);
    safeStorageSet({
      [DOT_POSITION_STORAGE_KEY]: {
        left: clamped.left,
        top: clamped.top,
      },
    });
  }

  function syncDotPositionWithWidget() {
    const widget = document.getElementById(WIDGET_ID);
    const dot = document.getElementById(WIDGET_DOT_ID);
    if (!widget || !dot) {
      return;
    }

    const rect = widget.getBoundingClientRect();
    const left = rect.left;
    const top = rect.top;

    dot.style.left = `${Math.max(0, left)}px`;
    dot.style.top = `${Math.max(0, top)}px`;
  }

  function syncDotPositionFromStoredWidgetPosition() {
    const dot = document.getElementById(WIDGET_DOT_ID);
    if (!dot) {
      return;
    }

    if (!isChromeStorageAvailable()) {
      syncDotPositionWithWidget();
      return;
    }

    safeStorageGet([DOT_POSITION_STORAGE_KEY, POSITION_STORAGE_KEY], {}, (result) => {
      if (!isChromeStorageAvailable()) {
        syncDotPositionWithWidget();
        return;
      }

      const dotSaved = result[DOT_POSITION_STORAGE_KEY];
      if (dotSaved && typeof dotSaved.left === "number" && typeof dotSaved.top === "number") {
        const dotWidth = dot.offsetWidth || 12;
        const dotHeight = dot.offsetHeight || 12;
        const dotClamped = clampPosition(dotSaved.left, dotSaved.top, dotWidth, dotHeight);
        dot.style.left = `${dotClamped.left}px`;
        dot.style.top = `${dotClamped.top}px`;
        return;
      }

      const saved = result[POSITION_STORAGE_KEY];
      if (!saved || typeof saved.left !== "number" || typeof saved.top !== "number") {
        syncDotPositionWithWidget();
        return;
      }

      const dotWidth = dot.offsetWidth || 12;
      const dotHeight = dot.offsetHeight || 12;
      const clamped = clampPosition(saved.left, saved.top, dotWidth, dotHeight);
      dot.style.left = `${clamped.left}px`;
      dot.style.top = `${clamped.top}px`;
    });
  }

  function setDotVisible(isVisible) {
    const dot = document.getElementById(WIDGET_DOT_ID);
    if (!dot) {
      return;
    }

    // Only show dot if there are cards available
    if (isVisible && cards.length > 0) {
      syncDotPositionFromStoredWidgetPosition();
      dot.style.display = "block";
    } else {
      dot.style.display = "none";
    }
  }

  function clearWidgetRevealTimers() {
    if (widgetRevealWidthTimerId) {
      window.clearTimeout(widgetRevealWidthTimerId);
      widgetRevealWidthTimerId = null;
    }

    if (widgetRevealHeightTimerId) {
      window.clearTimeout(widgetRevealHeightTimerId);
      widgetRevealHeightTimerId = null;
    }

    if (widgetRevealFinalizeTimerId) {
      window.clearTimeout(widgetRevealFinalizeTimerId);
      widgetRevealFinalizeTimerId = null;
    }
  }

  function setWidgetContentOpacity(widget, opacity) {
    const body = widget?.querySelector(`#${WIDGET_ID}-body`);
    const footer = widget?.querySelector(`#${WIDGET_ID}-footer`);
    const titleContainer = widget?.firstElementChild;

    [titleContainer, body, footer].forEach((element) => {
      if (element) {
        element.style.opacity = opacity;
      }
    });
  }

  function resetWidgetRevealState(widget) {
    if (!widget) {
      return;
    }

    clearWidgetRevealTimers();
    widget.dataset.isRevealing = "false";
    widget.style.display = "none";
    widget.style.width = "320px";
    widget.style.height = "";
    widget.style.padding = "12px";
    widget.style.borderRadius = "12px";
    widget.style.transition = "";
    widget.style.overflow = "";
    widget.style.overflowY = "auto";
    setWidgetContentOpacity(widget, "1");
  }

  function showWidgetWithReveal(widget) {
    if (!widget) {
      return;
    }

    if (widget.dataset.isRevealing === "true") {
      return;
    }

    clearWidgetRevealTimers();
    widget.dataset.isRevealing = "true";

    const finalWidth = Math.min(320, Math.max(window.innerWidth - 32, 12));
    widget.style.display = "block";
    widget.style.overflow = "hidden";
    widget.style.overflowY = "hidden";
    widget.style.width = "12px";
    widget.style.height = "12px";
    widget.style.padding = "0";
    widget.style.borderRadius = "999px";
    widget.style.transition = "width 0.3s ease, height 0.3s ease, padding 0.3s ease, border-radius 0.3s ease";
    setWidgetContentOpacity(widget, "0");

    widgetRevealWidthTimerId = window.setTimeout(() => {
      widget.style.width = `${finalWidth}px`;
      widget.style.borderRadius = "20px";
    }, 300);

    widgetRevealHeightTimerId = window.setTimeout(() => {
      const finalHeight = Math.min(widget.scrollHeight, 500);
      widget.style.height = `${Math.max(finalHeight, 12)}px`;
      widget.style.padding = "12px";
      widget.style.borderRadius = "12px";
      setWidgetContentOpacity(widget, "1");
    }, 600);

    widgetRevealFinalizeTimerId = window.setTimeout(() => {
      widget.dataset.isRevealing = "false";
      widget.style.height = "";
      widget.style.transition = "";
      widget.style.overflow = "";
      widget.style.overflowY = "auto";
      clearWidgetRevealTimers();
    }, 950);
  }

  function updateDndButtonVisual() {
    const dndBtn = document.getElementById(`${WIDGET_ID}-dnd-btn`);
    if (!dndBtn) {
      return;
    }

    if (isDndMode) {
      dndBtn.style.background = "#1f7a33";
      dndBtn.style.border = "1px solid #1f7a33";
      dndBtn.style.color = "#ffffff";
    } else {
      dndBtn.style.background = "#f3f5fb";
      dndBtn.style.border = "1px solid #cfd6ea";
      dndBtn.style.color = "#5a6aaa";
    }
  }

  function persistDndMode() {
    if (!isChromeStorageAvailable()) {
      return;
    }

    safeStorageSet({ [DND_MODE_STORAGE_KEY]: isDndMode });
  }

  function applyDndModeUi() {
    const widget = document.getElementById(WIDGET_ID);
    if (!widget) {
      return;
    }

    if (isDndMode) {
      isDndPreview = false;
      resetWidgetRevealState(widget);
      isWidgetVisible = false;
      setDotVisible(true);
    } else {
      setDotVisible(false);
      if (cards.length) {
        renderCurrentCard();
      }
    }
  }

  function createWidget() {
    if (document.getElementById(WIDGET_ID)) {
      return document.getElementById(WIDGET_ID);
    }

    const wrapper = document.createElement("div");
    wrapper.id = WIDGET_ID;
    wrapper.style.position = "fixed";
    wrapper.style.top = "16px";
    wrapper.style.right = "16px";
    wrapper.style.width = "320px";
    wrapper.style.maxWidth = "calc(100vw - 32px)";
    wrapper.style.padding = "12px";
    wrapper.style.borderRadius = "12px";
    wrapper.style.border = "1px solid rgba(80, 89, 117, 0.25)";
    wrapper.style.background = "#ffffff";
    wrapper.style.color = "#1d2433";
    wrapper.style.boxShadow = "0 8px 30px rgba(18, 28, 45, 0.18)";
    wrapper.style.zIndex = "2147483647";
    wrapper.style.fontFamily = "Segoe UI, Helvetica Neue, Arial, sans-serif";
    wrapper.style.display = "none";
    wrapper.style.maxHeight = "500px";
    wrapper.style.overflowY = "auto";

    const titleContainer = document.createElement("div");
    titleContainer.style.display = "flex";
    titleContainer.style.justifyContent = "space-between";
    titleContainer.style.alignItems = "center";
    titleContainer.style.marginBottom = "8px";
    titleContainer.style.cursor = "move";
    titleContainer.style.userSelect = "none";

    const titleLeft = document.createElement("div");
    titleLeft.style.display = "flex";
    titleLeft.style.alignItems = "center";
    titleLeft.style.gap = "6px";

    const title = document.createElement("div");
    title.textContent = "Recall Card";
    title.style.fontSize = "12px";
    title.style.fontWeight = "700";
    title.style.letterSpacing = "0.4px";
    title.style.textTransform = "uppercase";
    title.style.color = "#4a5575";

    const typeBadge = document.createElement("span");
    typeBadge.id = `${WIDGET_ID}-type-badge`;
    typeBadge.style.fontSize = "10px";
    typeBadge.style.fontWeight = "600";
    typeBadge.style.padding = "2px 6px";
    typeBadge.style.borderRadius = "999px";
    typeBadge.style.background = "#eef1ff";
    typeBadge.style.color = "#5a6aaa";
    typeBadge.style.border = "1px solid #cfd6ea";
    typeBadge.style.textTransform = "uppercase";
    typeBadge.style.letterSpacing = "0.3px";

    titleLeft.appendChild(title);
    titleLeft.appendChild(typeBadge);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.fontSize = "16px";
    closeBtn.style.border = "none";
    closeBtn.style.background = "transparent";
    closeBtn.style.color = "#999";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.padding = "0";
    closeBtn.style.width = "20px";
    closeBtn.style.height = "20px";
    closeBtn.style.display = "flex";
    closeBtn.style.alignItems = "center";
    closeBtn.style.justifyContent = "center";
    closeBtn.style.transition = "color 0.2s";
    closeBtn.style.flexShrink = "0";
    closeBtn.onmouseover = () => (closeBtn.style.color = "#555");
    closeBtn.onmouseout = () => (closeBtn.style.color = "#999");
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      isDndPreview = false;
      if (isDndMode) {
        resetWidgetRevealState(wrapper);
        isWidgetVisible = false;
        setDotVisible(true);
      } else {
        resetWidgetRevealState(wrapper);
        isWidgetVisible = false;
      }
      console.log(`[Recall Widget] Widget closed`);
    };

    const dndBtn = document.createElement("button");
    dndBtn.id = `${WIDGET_ID}-dnd-btn`;
    dndBtn.title = "Do Not Disturb";
    dndBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`;
    dndBtn.style.fontSize = "10px";
    dndBtn.style.fontWeight = "700";
    dndBtn.style.border = "1px solid #cfd6ea";
    dndBtn.style.borderRadius = "999px";
    dndBtn.style.background = "#f3f5fb";
    dndBtn.style.color = "#5a6aaa";
    dndBtn.style.cursor = "pointer";
    dndBtn.style.padding = "0";
    dndBtn.style.width = "22px";
    dndBtn.style.height = "22px";
    dndBtn.style.display = "flex";
    dndBtn.style.alignItems = "center";
    dndBtn.style.justifyContent = "center";
    dndBtn.style.flexShrink = "0";

    const controlsRight = document.createElement("div");
    controlsRight.style.display = "flex";
    controlsRight.style.alignItems = "center";
    controlsRight.style.gap = "6px";

    dndBtn.onclick = (e) => {
      e.stopPropagation();
      isDndMode = !isDndMode;
      isDndPreview = false;
      persistDndMode();
      updateDndButtonVisual();
      applyDndModeUi();
    };

    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const onMouseMove = (event) => {
      if (!isDragging) {
        return;
      }

      const width = wrapper.offsetWidth;
      const height = wrapper.offsetHeight;
      const maxLeft = Math.max(window.innerWidth - width, 0);
      const maxTop = Math.max(window.innerHeight - height, 0);

      const nextLeft = clamp(event.clientX - dragOffsetX, 0, maxLeft);
      const nextTop = clamp(event.clientY - dragOffsetY, 0, maxTop);

      wrapper.style.left = `${nextLeft}px`;
      wrapper.style.top = `${nextTop}px`;
      wrapper.style.right = "auto";
      if (isDndMode) {
        syncDotPositionWithWidget();
      }
    };

    const onMouseUp = () => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      persistWidgetPosition(wrapper);
      if (isDndMode) {
        syncDotPositionWithWidget();
      }
    };

    titleContainer.addEventListener("mousedown", (event) => {
      if (event.target === closeBtn) {
        return;
      }

      const rect = wrapper.getBoundingClientRect();
      wrapper.style.left = `${rect.left}px`;
      wrapper.style.top = `${rect.top}px`;
      wrapper.style.right = "auto";

      isDragging = true;
      dragOffsetX = event.clientX - rect.left;
      dragOffsetY = event.clientY - rect.top;
      document.body.style.userSelect = "none";

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });

    controlsRight.appendChild(dndBtn);
    controlsRight.appendChild(closeBtn);

    titleContainer.appendChild(titleLeft);
    titleContainer.appendChild(controlsRight);

    const body = document.createElement("div");
    body.id = `${WIDGET_ID}-body`;
    body.style.fontSize = "13px";
    body.style.lineHeight = "1.4";

    const footer = document.createElement("div");
    footer.style.marginTop = "8px";
    footer.style.fontSize = "11px";
    footer.style.color = "#66708a";
    footer.style.display = "flex";
    footer.style.alignItems = "center";
    footer.style.justifyContent = "space-between";
    footer.id = `${WIDGET_ID}-footer`;

    wrapper.appendChild(titleContainer);
    wrapper.appendChild(body);
    wrapper.appendChild(footer);
    document.body.appendChild(wrapper);

    const dndDot = document.createElement("div");
    dndDot.id = WIDGET_DOT_ID;
    dndDot.style.position = "fixed";
    dndDot.style.width = "12px";
    dndDot.style.height = "12px";
    dndDot.style.borderRadius = "50%";
    dndDot.style.background = "#27c93f";
    dndDot.style.boxShadow = "0 0 0 2px #ffffff, 0 0 0 4px rgba(39, 201, 63, 0.28)";
    dndDot.style.zIndex = "2147483647";
    dndDot.style.display = "none";
    dndDot.style.cursor = "pointer";
    dndDot.style.touchAction = "none";
    dndDot.title = "Recall widget in DND mode";
    dndDot.style.transition = "box-shadow 0.15s ease";

    const DOT_EFFECTS_STYLE_ID = "recall-widget-dot-effects";
    const DEFAULT_DOT_BACKGROUND = "#C5BAFF";
    const DEFAULT_DOT_BREATHE_BACKGROUND = "#b09bff";
    const DEFAULT_DOT_SHADOW = "0 0 0 2px #ffffff, 0 0 0 4px rgba(39, 201, 63, 0.28)";
    let dotShadowOffsetX = 0;
    let dotShadowOffsetY = 0;
    let hasStreakPulse = false;

    if (!document.getElementById(DOT_EFFECTS_STYLE_ID)) {
      const dotEffectsStyle = document.createElement("style");
      dotEffectsStyle.id = DOT_EFFECTS_STYLE_ID;
      dotEffectsStyle.textContent = "@keyframes recallBreathe { 0%,100% { transform:scale(1); background-color:var(--recall-dot-base-color); } 50% { transform:scale(1.26); background-color:var(--recall-dot-breathe-color); } } @keyframes recallStreakPulse { 0%,100% { box-shadow: var(--recall-dot-shadow-base), 0 0 0 2px rgba(255,200,60,0.25), 0 0 0 0 rgba(255,200,60,0.35); } 50% { box-shadow: var(--recall-dot-shadow-base), 0 0 0 2px rgba(255,200,60,0.18), 0 0 0 8px rgba(255,200,60,0); } }";
      (document.head || document.documentElement).appendChild(dotEffectsStyle);
    }

    const setDotBreathingColors = (baseColor, breatheColor) => {
      dndDot.style.setProperty("--recall-dot-base-color", baseColor);
      dndDot.style.setProperty("--recall-dot-breathe-color", breatheColor);
      dndDot.style.background = baseColor;
    };

    const buildDotShadow = (offsetX = 0, offsetY = 0) => {
      const roundedOffsetX = Math.round(offsetX * 100) / 100;
      const roundedOffsetY = Math.round(offsetY * 100) / 100;
      return `${roundedOffsetX}px ${roundedOffsetY}px 0 2px #ffffff, ${roundedOffsetX}px ${roundedOffsetY}px 0 4px rgba(39, 201, 63, 0.28)`;
    };

    const applyDotAnimationAndShadow = () => {
      const baseShadow = buildDotShadow(dotShadowOffsetX, dotShadowOffsetY);
      dndDot.style.setProperty("--recall-dot-shadow-base", baseShadow);
      dndDot.style.boxShadow = hasStreakPulse
        ? `${baseShadow}, 0 0 0 2px rgba(255,200,60,0.25)`
        : baseShadow;
      dndDot.style.animation = hasStreakPulse
        ? "recallBreathe 3s ease-in-out infinite, recallStreakPulse 2.5s ease-in-out infinite"
        : "recallBreathe 3s ease-in-out infinite";
    };

    const updateDotOpacityByTime = () => {
      const timeOfDay = getTimeOfDay();
      dndDot.style.opacity = timeOfDay === "early" || timeOfDay === "late" ? "0.6" : "1";
    };

    const updateDotExamCountdownColor = () => {
      safeStorageGet(["recallExamDate"], {}, (result) => {
        const daysUntilExam = getDaysUntilExam(result.recallExamDate || null);

        if (daysUntilExam !== null && daysUntilExam <= 2) {
          setDotBreathingColors("rgba(220,80,80,0.85)", "rgba(235,110,110,0.98)");
          return;
        }

        if (daysUntilExam !== null && daysUntilExam <= 7) {
          setDotBreathingColors("#F4A4A4", "#f08d8d");
          return;
        }

        if (daysUntilExam !== null && daysUntilExam <= 14) {
          setDotBreathingColors("#FAC775", "#ffb84f");
          return;
        }

        setDotBreathingColors(DEFAULT_DOT_BACKGROUND, DEFAULT_DOT_BREATHE_BACKGROUND);
      });
    };

    const updateDotStreakPulse = () => {
      getTodayAnsweredCount().then((count) => {
        hasStreakPulse = count >= 3;
        applyDotAnimationAndShadow();
      });
    };

    const onDocumentMouseMove = (event) => {
      const rect = dndDot.getBoundingClientRect();
      const dotCenterX = rect.left + (rect.width / 2);
      const dotCenterY = rect.top + (rect.height / 2);
      const deltaX = event.clientX - dotCenterX;
      const deltaY = event.clientY - dotCenterY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance < 80) {
        const angle = Math.atan2(deltaY, deltaX);
        const offsetMagnitude = ((80 - distance) / 80) * 5;
        dotShadowOffsetX = Math.cos(angle) * offsetMagnitude;
        dotShadowOffsetY = Math.sin(angle) * offsetMagnitude;
      } else if (dotShadowOffsetX !== 0 || dotShadowOffsetY !== 0) {
        dotShadowOffsetX = 0;
        dotShadowOffsetY = 0;
      } else {
        return;
      }

      applyDotAnimationAndShadow();
    };

    dndDot.style.setProperty("--recall-dot-shadow-base", DEFAULT_DOT_SHADOW);
    setDotBreathingColors(DEFAULT_DOT_BACKGROUND, DEFAULT_DOT_BREATHE_BACKGROUND);
    applyDotAnimationAndShadow();
    updateDotOpacityByTime();
    updateDotExamCountdownColor();
    updateDotStreakPulse();
    window.setInterval(updateDotOpacityByTime, 60000);
    window.setInterval(updateDotExamCountdownColor, 60000);
    window.setInterval(updateDotStreakPulse, 60000);
    document.addEventListener("mousemove", onDocumentMouseMove, { passive: true });

    let isDotDragging = false;
    let dotDragOffsetX = 0;
    let dotDragOffsetY = 0;
    let dotHoverPreviewTimerId = null;

    const clearDotPreviewTimer = () => {
      if (!dotHoverPreviewTimerId) {
        return;
      }
      window.clearTimeout(dotHoverPreviewTimerId);
      dotHoverPreviewTimerId = null;
    };

    const onDotMouseMove = (event) => {
      if (!isDotDragging) {
        return;
      }

      const dotWidth = dndDot.offsetWidth || 12;
      const dotHeight = dndDot.offsetHeight || 12;
      const clamped = clampPosition(
        event.clientX - dotDragOffsetX,
        event.clientY - dotDragOffsetY,
        dotWidth,
        dotHeight,
      );

      dndDot.style.left = `${clamped.left}px`;
      dndDot.style.top = `${clamped.top}px`;
    };

    const onDotMouseUp = () => {
      if (!isDotDragging) {
        return;
      }

      isDotDragging = false;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onDotMouseMove);
      window.removeEventListener("mouseup", onDotMouseUp);
      persistDotPosition(dndDot);
    };

    dndDot.addEventListener("mousedown", (event) => {
      if (!isDndMode) {
        return;
      }

      clearDotPreviewTimer();
      event.preventDefault();
      event.stopPropagation();
      isDotDragging = true;

      const rect = dndDot.getBoundingClientRect();
      dotDragOffsetX = event.clientX - rect.left;
      dotDragOffsetY = event.clientY - rect.top;
      document.body.style.userSelect = "none";

      window.addEventListener("mousemove", onDotMouseMove);
      window.addEventListener("mouseup", onDotMouseUp);
    });

    dndDot.addEventListener("mouseenter", () => {
      if (!isDndMode) {
        return;
      }

      if (isDotDragging) {
        return;
      }

      clearDotPreviewTimer();
      dotHoverPreviewTimerId = window.setTimeout(() => {
        if (!isDndMode || isDotDragging) {
          return;
        }

        isDndPreview = true;
        setDotVisible(false);
        showWidgetWithReveal(wrapper);
        isWidgetVisible = true;
      }, 450);
    });

    dndDot.addEventListener("mouseleave", () => {
      clearDotPreviewTimer();
    });
    document.body.appendChild(dndDot);

    wrapper.addEventListener("mouseleave", () => {
      if (!isDndMode || !isDndPreview) {
        return;
      }
      isDndPreview = false;
      resetWidgetRevealState(wrapper);
      isWidgetVisible = false;
      setDotVisible(true);
    });

    updateDndButtonVisual();

    restoreWidgetPosition(wrapper);

    window.addEventListener("resize", () => {
      if (wrapper.style.right !== "auto") {
        return;
      }

      const rect = wrapper.getBoundingClientRect();
      applyWidgetPosition(wrapper, rect.left, rect.top);
      persistWidgetPosition(wrapper);
      if (isDndMode) {
        syncDotPositionFromStoredWidgetPosition();
      }
    });

    return wrapper;
  }

  function createOptionButton(text, isCorrect, isSelected, onClickCallback, isDisabled = false) {
    const widget = document.getElementById(WIDGET_ID);
    const speed = parseFloat(widget?.style.getPropertyValue("--recall-anim-speed") || "1") || 1;
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.padding = "8px";
    btn.style.marginBottom = "6px";
    btn.style.border = "1px solid #ddd";
    btn.style.borderRadius = "6px";
    btn.style.background = "#f5f5f5";
    btn.style.color = "#333";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.transition = `all ${0.3 * speed}s`;
    btn.style.fontFamily = "inherit";

    if (isSelected) {
      btn.style.border = "1px solid " + (isCorrect ? "#4CAF50" : "#f44336");
      btn.style.background = isCorrect ? "#E8F5E9" : "#FFEBEE";
      btn.style.color = isCorrect ? "#2E7D32" : "#C62828";
      btn.style.fontWeight = "bold";
      btn.disabled = true;
    } else if (isDisabled) {
      btn.style.opacity = "0.45";
      btn.style.cursor = "not-allowed";
      btn.disabled = true;
    } else {
      btn.onmouseover = () => {
        btn.style.background = "#efefef";
        btn.style.border = "1px solid #999";
      };
      btn.onmouseout = () => {
        btn.style.background = "#f5f5f5";
        btn.style.border = "1px solid #ddd";
      };
      btn.onclick = onClickCallback;
    }

    return btn;
  }

  function createInputButton(text, variant = "primary") {
    const widget = document.getElementById(WIDGET_ID);
    const speed = parseFloat(widget?.style.getPropertyValue("--recall-anim-speed") || "1") || 1;
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.padding = "6px 12px";
    btn.style.margin = "4px";
    btn.style.border = "1px solid #ddd";
    btn.style.borderRadius = "4px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.fontFamily = "inherit";
    btn.style.transition = `all ${0.2 * speed}s`;

    if (variant === "primary") {
      btn.style.background = "#2196F3";
      btn.style.color = "white";
      btn.style.border = "1px solid #2196F3";
    } else if (variant === "secondary") {
      btn.style.background = "#f5f5f5";
      btn.style.color = "#333";
      btn.style.border = "1px solid #ddd";
    }

    btn.onmouseover = () => {
      btn.style.opacity = "0.8";
    };
    btn.onmouseout = () => {
      btn.style.opacity = "1";
    };

    return btn;
  }

  function renderCurrentCard() {
    const widget = document.getElementById(WIDGET_ID);
    if (!widget) {
      return;
    }

    const CARD_EFFECTS_STYLE_ID = "recall-widget-card-effects";
    if (!document.getElementById(CARD_EFFECTS_STYLE_ID)) {
      const cardEffectsStyle = document.createElement("style");
      cardEffectsStyle.id = CARD_EFFECTS_STYLE_ID;
      cardEffectsStyle.textContent = "@keyframes recallCardBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.003)} } @keyframes recallSkeletonShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }";
      (document.head || document.documentElement).appendChild(cardEffectsStyle);
    }

    const body = widget.querySelector(`#${WIDGET_ID}-body`);
    const footer = widget.querySelector(`#${WIDGET_ID}-footer`);
    if (!body || !footer) {
      return;
    }

    if (!widget.style.getPropertyValue("--recall-anim-speed")) {
      widget.style.setProperty("--recall-anim-speed", "1");
    }

    const applyBodyAnimation = () => {
      const speed = parseFloat(widget.style.getPropertyValue("--recall-anim-speed") || "1") || 1;
      body.style.animation = widget.matches(":hover")
        ? "none"
        : `recallCardBreathe ${3 * speed}s ease-in-out infinite`;
    };

    if (!widget.dataset.recallCardHoverBound) {
      widget.addEventListener("mouseenter", () => {
        const nextBody = widget.querySelector(`#${WIDGET_ID}-body`);
        if (nextBody) {
          nextBody.style.animation = "none";
        }
      });
      widget.addEventListener("mouseleave", () => {
        const nextBody = widget.querySelector(`#${WIDGET_ID}-body`);
        if (!nextBody) {
          return;
        }

        const speed = parseFloat(widget.style.getPropertyValue("--recall-anim-speed") || "1") || 1;
        nextBody.style.animation = `recallCardBreathe ${3 * speed}s ease-in-out infinite`;
      });
      widget.dataset.recallCardHoverBound = "true";
    }

    safeStorageGet(["recallExamDate"], {}, (result) => {
      const daysUntilExam = getDaysUntilExam(result.recallExamDate || null);
      widget.style.setProperty("--recall-anim-speed", daysUntilExam !== null && daysUntilExam >= 1 && daysUntilExam <= 7 ? "1.18" : "1");
      applyBodyAnimation();
    });

    const showSkeleton = () => {
      const speed = parseFloat(widget.style.getPropertyValue("--recall-anim-speed") || "1") || 1;
      const skeleton = document.createElement("div");
      skeleton.id = `${WIDGET_ID}-skeleton`;
      skeleton.style.display = "grid";
      skeleton.style.gap = "8px";

      const createSkeletonLine = (width) => {
        const line = document.createElement("div");
        line.style.width = width;
        line.style.height = "12px";
        line.style.borderRadius = "999px";
        line.style.background = "linear-gradient(90deg, #eef2fb 25%, #f8faff 50%, #eef2fb 75%)";
        line.style.backgroundSize = "200% 100%";
        line.style.animation = `recallSkeletonShimmer ${1.35 * speed}s linear infinite`;
        return line;
      };

      skeleton.appendChild(createSkeletonLine("100%"));
      skeleton.appendChild(createSkeletonLine("72%"));

      for (let index = 0; index < 4; index += 1) {
        skeleton.appendChild(createSkeletonLine("80%"));
      }

      body.innerHTML = "";
      body.appendChild(skeleton);
    };

    const hideSkeleton = () => {
      const skeleton = body.querySelector(`#${WIDGET_ID}-skeleton`);
      if (skeleton) {
        skeleton.remove();
      }
    };

    showSkeleton();
    applyBodyAnimation();

    const wasWidgetVisible = isWidgetVisible;

    if (!cards.length) {
      resetWidgetRevealState(widget);
      isWidgetVisible = false;
      setDotVisible(false);
      return;
    }

    if (isDndMode && !isDndPreview) {
      resetWidgetRevealState(widget);
      isWidgetVisible = false;
      setDotVisible(true);
    } else {
      isWidgetVisible = true;
      setDotVisible(false);
    }
    const safeIndex = index % cards.length;
    const card = cards[safeIndex];

    const typeBadge = widget.querySelector(`#${WIDGET_ID}-type-badge`);
    if (typeBadge && card) {
      const typeLabels = {
        mcq: "Multiple Choice",
        fact: "Did You Know",
        short_answer: "Short Answer",
        fill_blank: "Fill in the Blank",
      };
      typeBadge.textContent = typeLabels[card.type] || card.type || "Card";
    }

    // Clear body
    body.innerHTML = "";

    if (!card) {
      hideSkeleton();
      body.textContent = "No card available.";
      footer.textContent = `${safeIndex + 1} / ${cards.length}`;
      return;
    }

    const cardKey = `${safeIndex}-${card.question || card.content}`;
    const state = cardState[cardKey] || { answered: false, correct: null, userAnswer: null };
    if (pendingWrongAnswer && !state.answered) {
      return;
    }

    // Render based on card type
    if (card.type === "ghost") {
      hideSkeleton();
      footer.innerHTML = "";

      const ghostDiv = document.createElement("div");
      ghostDiv.textContent = card.content;
      ghostDiv.style.padding = "18px 16px";
      ghostDiv.style.textAlign = "center";
      ghostDiv.style.border = "1px solid rgba(197,186,255,0.4)";
      ghostDiv.style.background = "rgba(197,186,255,0.12)";
      ghostDiv.style.borderRadius = "10px";
      ghostDiv.style.color = "#5c4f88";
      ghostDiv.style.fontSize = "14px";
      ghostDiv.style.lineHeight = "1.5";
      ghostDiv.style.cursor = "pointer";
      ghostDiv.onclick = () => {
        animateAdvanceToNextCard(widget, card._id, false);
      };
      body.appendChild(ghostDiv);
      return;
    } else if (card.type === "mcq") {
      hideSkeleton();
      const questionDiv = document.createElement("div");
      questionDiv.textContent = card.question;
      questionDiv.style.marginBottom = "10px";
      decoratePromptAndWidget(questionDiv, card.question, card, safeIndex, widget);
      body.appendChild(questionDiv);

      const correctAnswer = normalizeAnswer(card.correct || "");

      if (state.answered) {
        // Show options with feedback
        (card.options || []).forEach((option) => {
          const isCorrect = normalizeAnswer(option) === correctAnswer;
          const isSelected = isCorrect || normalizeAnswer(state.userAnswer || "") === normalizeAnswer(option);
          const btn = createOptionButton(option, isCorrect, isSelected, () => { }, !isSelected);
          body.appendChild(btn);
        });

        if (state.correct === false) {
          const answerDiv = document.createElement("div");
          answerDiv.textContent = `Correct Answer: ${card.correct}`;
          answerDiv.style.marginTop = "8px";
          answerDiv.style.padding = "8px";
          answerDiv.style.background = "#E8F5E9";
          answerDiv.style.color = "#2E7D32";
          answerDiv.style.borderRadius = "4px";
          answerDiv.style.fontSize = "12px";
          body.appendChild(answerDiv);
        }
      } else {
        // Show selectable options
        (card.options || []).forEach((option) => {
          const btn = createOptionButton(option, false, false, (e) => {
            e.stopPropagation();
            const isCorrect = normalizeAnswer(option) === correctAnswer;
            if (!isCorrect) {
              pendingWrongAnswer = true;
              lastAnswerWasCorrect = false;
              cardState[cardKey] = { answered: false, correct: false, userAnswer: option };
              currentCardInteracted = true;
              if (card._id) widgetSubmitReview(card._id, 1, card.sourceId);
              window.setTimeout(() => {
                cardState[cardKey] = { answered: true, correct: false, userAnswer: option };
                pendingWrongAnswer = false;
                renderCurrentCard();
              }, 180);
              return;
            }

            pendingWrongAnswer = false;
            lastAnswerWasCorrect = true;
            cardState[cardKey] = { answered: true, correct: isCorrect, userAnswer: option };
            currentCardInteracted = true;
            maybeFireFirstCorrectBurst(widget);
            if (card._id) widgetSubmitReview(card._id, 5, card.sourceId);
            animateAdvanceToNextCard(widget, card._id, true, 5);
          });
          body.appendChild(btn);
        });

        const giveUpBtn = createInputButton("Give Up", "secondary");
        giveUpBtn.onclick = (e) => {
          e.stopPropagation();
          sessionGiveUpCount += 1;
          lastAnswerWasCorrect = false;
          cardState[cardKey] = { answered: true, correct: false, userAnswer: null };
          currentCardInteracted = true;
          if (card._id) widgetSubmitReview(card._id, 1, card.sourceId);
          renderCurrentCard();
        };
        body.appendChild(giveUpBtn);
      }
    } else if (card.type === "fact") {
      hideSkeleton();
      const factDiv = document.createElement("div");
      factDiv.textContent = `Do you know: ${card.content}`;
      factDiv.style.marginBottom = "10px";
      decoratePromptAndWidget(factDiv, `Do you know: ${card.content}`, card, safeIndex, widget);
      body.appendChild(factDiv);

      if (!state.answered) {
        const yesBtn = createInputButton("Yes", "primary");
        yesBtn.onclick = (e) => {
          e.stopPropagation();
          lastAnswerWasCorrect = true;
          cardState[cardKey] = { answered: true, correct: true, userAnswer: "yes" };
          currentCardInteracted = true;
          maybeFireFirstCorrectBurst(widget);
          if (card._id) widgetSubmitReview(card._id, 4, card.sourceId);
          animateAdvanceToNextCard(widget, card._id, true, 4);
        };

        const noBtn = createInputButton("No", "secondary");
        noBtn.onclick = (e) => {
          e.stopPropagation();
          lastAnswerWasCorrect = false;
          cardState[cardKey] = { answered: true, correct: false, userAnswer: "no" };
          currentCardInteracted = true;
          if (card._id) widgetSubmitReview(card._id, 2, card.sourceId);
          renderCurrentCard();
        };

        body.appendChild(yesBtn);
        body.appendChild(noBtn);
      } else {
        const feedbackDiv = document.createElement("div");
        feedbackDiv.style.marginTop = "8px";
        feedbackDiv.style.padding = "8px";
        feedbackDiv.style.borderRadius = "4px";
        feedbackDiv.style.fontSize = "12px";
        feedbackDiv.textContent = state.userAnswer === "yes" ? "Great! You knew this." : "Learn something new!";
        feedbackDiv.style.background = state.correct ? "#E8F5E9" : "#FFF9C4";
        feedbackDiv.style.color = state.correct ? "#2E7D32" : "#F57F17";
        body.appendChild(feedbackDiv);
      }
    } else {
      // short_answer or fill_blank
      hideSkeleton();
      const questionDiv = document.createElement("div");
      questionDiv.textContent = card.question;
      questionDiv.style.marginBottom = "10px";
      decoratePromptAndWidget(questionDiv, card.question, card, safeIndex, widget);
      body.appendChild(questionDiv);

      if (state.answered) {
        const feedbackDiv = document.createElement("div");
        feedbackDiv.style.marginTop = "8px";
        feedbackDiv.style.padding = "8px";
        feedbackDiv.style.background = state.correct ? "#E8F5E9" : "#FFEBEE";
        feedbackDiv.style.color = state.correct ? "#2E7D32" : "#C62828";
        feedbackDiv.style.borderRadius = "4px";
        feedbackDiv.style.fontSize = "12px";

        if (state.correct) {
          feedbackDiv.textContent = "Correct!";
        } else {
          feedbackDiv.textContent = `Answer: ${card.correct || card.answer}`;
        }
        body.appendChild(feedbackDiv);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Your answer...";
        input.style.width = "100%";
        input.style.padding = "6px";
        input.style.marginBottom = "6px";
        input.style.border = "1px solid #ddd";
        input.style.borderRadius = "4px";
        input.style.fontSize = "12px";
        input.style.boxSizing = "border-box";
        input.style.fontFamily = "inherit";
        body.appendChild(input);

        const submitBtn = createInputButton("Submit", "primary");
        let inputStartTime = null;
        let backspaceCount = 0;

        if (card.type === "fill_blank") {
          submitBtn.style.background = "#e0e0e0";
          submitBtn.style.border = "1px solid #e0e0e0";
          submitBtn.style.color = "#333";

          input.addEventListener("keydown", (event) => {
            if (inputStartTime === null) {
              inputStartTime = Date.now();
            }

            if (event.key === "Backspace") {
              backspaceCount += 1;
            }
          });

          input.addEventListener("keyup", () => {
            const warmth = Math.min(input.value.length / 15, 1);
            const nextColor = lerpColor("#e0e0e0", "#C5BAFF", warmth);
            submitBtn.style.background = nextColor;
            submitBtn.style.border = `1px solid ${nextColor}`;
            submitBtn.style.color = warmth > 0.45 ? "#2f2350" : "#333";
          });
        }

        submitBtn.onclick = async (e) => {
          e.stopPropagation();
          const correctAns = normalizeAnswer(card.correct || card.answer || "");
          const userAns = normalizeAnswer(input.value);
          const isCorrect = fuzzyMatch(userAns, correctAns)
            || await semanticMatch(card.question || "", userAns, correctAns);
          const elapsed = inputStartTime === null ? Number.POSITIVE_INFINITY : Date.now() - inputStartTime;
          let quality = isCorrect ? 5 : 1;

          if (card.type === "fill_blank") {
            if (!isCorrect) {
              quality = 0;
            } else if (elapsed < 4000 && backspaceCount <= 1) {
              quality = 5;
            } else if (elapsed < 10000 && backspaceCount <= 2) {
              quality = 4;
            } else {
              quality = 3;
            }
          }

          cardState[cardKey] = { answered: true, correct: isCorrect, userAnswer: input.value };
          lastAnswerWasCorrect = isCorrect;
          currentCardInteracted = true;
          if (isCorrect) {
            maybeFireFirstCorrectBurst(widget);
          }
          if (card._id) widgetSubmitReview(card._id, quality, card.sourceId);
          if (isCorrect) {
            animateAdvanceToNextCard(widget, card._id, true, quality);
            return;
          }

          renderCurrentCard();
        };

        const giveUpBtn = createInputButton("Give Up", "secondary");
        giveUpBtn.onclick = (e) => {
          e.stopPropagation();
          sessionGiveUpCount += 1;
          lastAnswerWasCorrect = false;
          cardState[cardKey] = { answered: true, correct: false, userAnswer: null };
          currentCardInteracted = true;
          if (card._id) widgetSubmitReview(card._id, 1, card.sourceId);
          renderCurrentCard();
        };

        const btnContainer = document.createElement("div");
        btnContainer.style.margin = "-4px"; // Offset margin of buttons
        btnContainer.appendChild(submitBtn);
        btnContainer.appendChild(giveUpBtn);
        body.appendChild(btnContainer);
      }
    }

    footer.innerHTML = "";

    const footerCounter = document.createElement("span");
    footerCounter.textContent = `${safeIndex + 1} / ${cards.length}`;
    footer.appendChild(footerCounter);

    const resourceBtns = document.createElement("div");
    resourceBtns.style.display = "flex";
    resourceBtns.style.alignItems = "center";
    resourceBtns.style.gap = "5px";

    if (card.youtubeQuery) {
      const ytBtn = document.createElement("a");
      ytBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(card.youtubeQuery)}`;
      ytBtn.target = "_blank";
      ytBtn.rel = "noopener noreferrer";
      ytBtn.title = `YouTube: ${card.youtubeQuery}`;
      ytBtn.style.display = "inline-flex";
      ytBtn.style.alignItems = "center";
      ytBtn.style.justifyContent = "center";
      ytBtn.style.width = "22px";
      ytBtn.style.height = "22px";
      ytBtn.style.borderRadius = "50%";
      ytBtn.style.background = "#fff0f0";
      ytBtn.style.border = "1px solid #f5c6c6";
      ytBtn.style.color = "#c4302b";
      ytBtn.style.textDecoration = "none";
      ytBtn.style.flexShrink = "0";
      ytBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
      ytBtn.onmouseover = () => (ytBtn.style.background = "#fddede");
      ytBtn.onmouseout = () => (ytBtn.style.background = "#fff0f0");
      resourceBtns.appendChild(ytBtn);
    }

    if (card.googleQuery) {
      const gBtn = document.createElement("a");
      gBtn.href = `https://www.google.com/search?q=${encodeURIComponent(card.googleQuery)}`;
      gBtn.target = "_blank";
      gBtn.rel = "noopener noreferrer";
      gBtn.title = `Search: ${card.googleQuery}`;
      gBtn.style.display = "inline-flex";
      gBtn.style.alignItems = "center";
      gBtn.style.justifyContent = "center";
      gBtn.style.width = "22px";
      gBtn.style.height = "22px";
      gBtn.style.borderRadius = "50%";
      gBtn.style.background = "#f0f4ff";
      gBtn.style.border = "1px solid #c6d4f5";
      gBtn.style.color = "#326fd1";
      gBtn.style.textDecoration = "none";
      gBtn.style.flexShrink = "0";
      gBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
      gBtn.onmouseover = () => (gBtn.style.background = "#dde8ff");
      gBtn.onmouseout = () => (gBtn.style.background = "#f0f4ff");
      resourceBtns.appendChild(gBtn);
    }

    if (resourceBtns.hasChildNodes()) {
      footer.appendChild(resourceBtns);
    }

    if (!isDndMode || isDndPreview) {
      if (!wasWidgetVisible) {
        showWidgetWithReveal(widget);
      } else {
        widget.style.display = "block";
      }
    }
  }

  async function triggerOnIdle() {
    if (!cards.length) {
      hideWidgetUntilQueueRefresh();
      return;
    }

    if (queueCompleted) {
      hideWidgetUntilQueueRefresh();
      return;
    }

    if (currentCardInteracted) {
      // User already answered — advance to next card before showing
      const hasNextCard = advanceToNextUnansweredCard();
      if (!hasNextCard) {
        return;
      }
      console.log(`[Recall Widget] Advancing to card ${index + 1}/${cards.length}`);
    } else if (isWidgetVisible) {
      console.log("[Recall Widget] Idle trigger ignored: waiting for current card interaction");
      return;
    }

    const widget = document.getElementById(WIDGET_ID);
    if (widget) {
      const entryAnimation = await getEntryAnimation();
      const animationNameMatch = typeof entryAnimation.style?.animation === "string"
        ? entryAnimation.style.animation.match(/^[^\s]+/)
        : null;
      const animationName = animationNameMatch ? animationNameMatch[0] : null;

      if (animationName && !document.getElementById(animationName)) {
        const animationStyle = document.createElement("style");
        animationStyle.id = animationName;
        animationStyle.textContent = entryAnimation.keyframe;
        (document.head || document.documentElement).appendChild(animationStyle);
      }

      Object.entries(entryAnimation.style || {}).forEach(([property, value]) => {
        widget.style[property] = value;
      });

      widget.addEventListener("animationend", () => {
        Object.keys(entryAnimation.style || {}).forEach((property) => {
          widget.style[property] = "";
        });
      }, { once: true });
    }

    lastIdleTriggerAt = Date.now();
    renderCurrentCard();
    console.log(`[Recall Widget] Card ${index + 1}/${cards.length} shown on idle trigger`);
  }

  function startIdleMonitor() {
    if (idleTimerId) {
      clearInterval(idleTimerId);
      idleTimerId = null;
    }

    if (!cards.length) {
      const widget = document.getElementById(WIDGET_ID);
      if (widget) {
        widget.style.display = "none";
      }
      isWidgetVisible = false;
      console.log("[Recall Widget] No cards available");
      return;
    }

    const userActivityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
    ];

    const onUserActivity = () => {
      lastUserActivityAt = Date.now();
      idleTriggered = false;
    };

    if (!window.__recallWidgetIdleEventsBound) {
      userActivityEvents.forEach((eventName) => {
        window.addEventListener(eventName, onUserActivity, { passive: true });
      });
      window.__recallWidgetIdleEventsBound = true;
      window.__recallWidgetOnUserActivity = onUserActivity;
    }

    idleTimerId = window.setInterval(() => {
      const idleFor = Date.now() - lastUserActivityAt;
      if (idleFor >= IDLE_THRESHOLD_MS && !idleTriggered) {
        idleTriggered = true;
        triggerOnIdle();
      }
    }, IDLE_CHECK_MS);
  }

  function setCards(nextCards) {
    clearDueQueueRefreshTimer();

    allCardsForLogging = Array.isArray(nextCards)
      ? nextCards.filter((card) => card && (card.question || card.content))
      : [];

    // Queue only due cards using SM-2 state (nextReview <= now).
    const dueCards = widgetGetDueCards(allCardsForLogging, sm2State);
    const now = Date.now();

    cards = dueCards.slice().sort((leftCard, rightCard) => {
      const leftNextReview = leftCard?._id ? sm2State[leftCard._id]?.nextReview : null;
      const rightNextReview = rightCard?._id ? sm2State[rightCard._id]?.nextReview : null;
      const leftMinutes = leftNextReview == null ? 0 : Math.round((new Date(leftNextReview).getTime() - now) / 60000);
      const rightMinutes = rightNextReview == null ? 0 : Math.round((new Date(rightNextReview).getTime() - now) / 60000);
      return leftMinutes - rightMinutes;
    });
    logAllCardIntervals(allCardsForLogging, sm2State);

    index = 0;
    completedQueueCardKeys = new Set();
    queueCompleted = false;
    cardState = {};
    pendingWrongAnswer = false;
    currentCardInteracted = false;
    idleTriggered = false;
    lastUserActivityAt = Date.now();
    startIdleMonitor();

    if (!cards.length) {
      scheduleDueQueueRefresh();
    }
  }

  function loadCardsFromStorage() {
    if (!isChromeStorageAvailable()) {
      return;
    }

    safeStorageGet([
      STORAGE_KEY,
      DND_MODE_STORAGE_KEY,
      "recallSM2State",
      "recallExamDate",
      "recallLastSourceId",
      "recallLastReviewedAt",
      "pulsedAt",
    ], {}, async (result) => {
      isDndMode = Boolean(result[DND_MODE_STORAGE_KEY]);
      sm2State = result.recallSM2State || {};
      updateDndButtonVisual();
      const contextualCards = await getCardsForCurrentContext(result[STORAGE_KEY]);
      const ghostCards = await injectGhostCardIfNeeded(contextualCards, result.recallLastSourceId || contextualCards[0]?.sourceId || null);
      setCards(ghostCards);
      applyDndModeUi();

      const sourceId = result.recallLastSourceId || ghostCards.find((card) => card?.sourceId)?.sourceId || null;
      const lastReviewedAtMap = result.recallLastReviewedAt || {};
      const pulsedAt = result.pulsedAt || {};
      const today = new Date().toISOString().slice(0, 10);
      const lastReviewedAt = Number(sourceId ? lastReviewedAtMap[sourceId] : 0) || 0;

      if (sourceId && lastReviewedAt && (Date.now() - lastReviewedAt > 3 * 86400000) && pulsedAt[sourceId] !== today) {
        safeStorageSet({
          pulsedAt: {
            ...pulsedAt,
            [sourceId]: today,
          },
        }, () => {
          window.setTimeout(() => {
            triggerDndSilencePulseOnce();
          }, 0);
        });
      }
    });

    safeStorageSet({ recallLastOpenedAt: Date.now() });
  }

  function registerStorageChangeListener() {
    if (!isExtensionContextValid() || storageChangeListener) {
      return;
    }

    storageChangeListener = (changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (changes[DND_MODE_STORAGE_KEY]) {
        isDndMode = Boolean(changes[DND_MODE_STORAGE_KEY].newValue);
        isDndPreview = false;
        updateDndButtonVisual();
        applyDndModeUi();
      }

      if (changes["recallSM2State"]) {
        sm2State = changes["recallSM2State"].newValue || {};
        logAllCardIntervals(allCardsForLogging, sm2State);

        if (!cards.length || queueCompleted) {
          scheduleDueQueueRefresh();
        }
      }

      if (changes[STORAGE_KEY]) {
        getCardsForCurrentContext(changes[STORAGE_KEY].newValue).then((contextualCards) => {
          setCards(contextualCards);
          applyDndModeUi();
        });
      }
    };

    try {
      chrome.storage.onChanged.addListener(storageChangeListener);
    } catch (error) {
      if (isContextInvalidationError(error)) {
        handleExtensionContextInvalidated(error);
      }
      storageChangeListener = null;
    }
  }

  const LOCAL_SNAPSHOT_REQUEST_EVENT = "RECALL_REQUEST_LOCAL_SNAPSHOT";
  const LOCAL_SNAPSHOT_REPLY_EVENT = "RECALL_LOCAL_SNAPSHOT";

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }

    const payload = event.data;

    if (payload && payload.type === LOCAL_SNAPSHOT_REQUEST_EVENT) {
      const STORAGE_KEYS = [
        "recallWidgetCards",
        "recallSM2State",
        "recallTodayStats",
        "recallExamDate",
        "recallLastSourceId",
        "recallLastReviewedAt",
        "recallLastOpenedAt",
        "recallWidgetDndMode",
        "recallAuthToken",
        "recallUser",
        "pulsedAt",
        "ghostCardShown",
        "seenFirstCardPerSource",
        "recallTopicColors",
      ];

      safeStorageGet(STORAGE_KEYS, {}, (result) => {
        window.postMessage(
          {
            type: LOCAL_SNAPSHOT_REPLY_EVENT,
            data: result || {},
          },
          window.location.origin,
        );
      });

      return;
    }

    if (!payload || payload.type !== DASHBOARD_SYNC_EVENT) {
      return;
    }

    const nextCards = Array.isArray(payload.cards) ? payload.cards : [];
    safeStorageSet({ [STORAGE_KEY]: nextCards }, (didSave) => {
      if (!didSave) {
        console.log("[Recall Widget] Failed to sync cards from dashboard");
        return;
      }

      safeStorageGet(["recallSM2State"], {}, (result) => {
        sm2State = result.recallSM2State || {};
        getCardsForCurrentContext(nextCards).then((contextualCards) => {
          setCards(contextualCards);
          applyDndModeUi();
        });
      });

      console.log(`[Recall Widget] Synced ${nextCards.length} cards from dashboard`);
    });
  });

  // Proactively push local snapshot when running on the dashboard page so the
  // dashboard receives data even if its request postMessage was sent before this
  // content script listener was registered (document_idle timing race).
  function maybePushLocalSnapshotToDashboard() {
    const SNAPSHOT_KEYS = [
      "recallWidgetCards",
      "recallSM2State",
      "recallTodayStats",
      "recallExamDate",
      "recallLastSourceId",
      "recallLastReviewedAt",
      "recallLastOpenedAt",
      "recallWidgetDndMode",
      "recallAuthToken",
      "recallUser",
      "pulsedAt",
      "ghostCardShown",
      "seenFirstCardPerSource",
      "recallTopicColors",
    ];

    safeStorageGet(SNAPSHOT_KEYS, {}, (result) => {
      window.postMessage(
        {
          type: LOCAL_SNAPSHOT_REPLY_EVENT,
          data: result || {},
        },
        window.location.origin,
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      registerStorageChangeListener();
      createWidget();
      loadCardsFromStorage();
      maybePushLocalSnapshotToDashboard();
    }, { once: true });
  } else {
    registerStorageChangeListener();
    createWidget();
    loadCardsFromStorage();
    maybePushLocalSnapshotToDashboard();
  }
})();
