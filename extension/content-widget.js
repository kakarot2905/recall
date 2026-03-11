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

  let cards = [];
  let index = 0;
  let idleTimerId = null;
  let idleTriggered = false;
  let lastUserActivityAt = Date.now();
  let isWidgetVisible = false;
  let cardState = {}; // Track answered state for cards
  let currentCardInteracted = false;
  let isDndMode = false;
  let isDndPreview = false;

  function normalizeAnswer(text) {
    return text.toLowerCase().trim();
  }

  function isChromeStorageAvailable() {
    return Boolean(typeof chrome !== "undefined" && chrome.storage && chrome.storage.local);
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
    chrome.storage.local.set({
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

    chrome.storage.local.get([POSITION_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        return;
      }

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
    chrome.storage.local.set({
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

    chrome.storage.local.get([DOT_POSITION_STORAGE_KEY, POSITION_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
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

    chrome.storage.local.set({ [DND_MODE_STORAGE_KEY]: isDndMode });
  }

  function applyDndModeUi() {
    const widget = document.getElementById(WIDGET_ID);
    if (!widget) {
      return;
    }

    if (isDndMode) {
      isDndPreview = false;
      widget.style.display = "none";
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
        wrapper.style.display = "none";
        isWidgetVisible = false;
        setDotVisible(true);
      } else {
        wrapper.style.display = "none";
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
        wrapper.style.display = "block";
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
      wrapper.style.display = "none";
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
    btn.style.transition = "all 0.3s";
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
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.padding = "6px 12px";
    btn.style.margin = "4px";
    btn.style.border = "1px solid #ddd";
    btn.style.borderRadius = "4px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.fontFamily = "inherit";
    btn.style.transition = "all 0.2s";

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

    const body = widget.querySelector(`#${WIDGET_ID}-body`);
    const footer = widget.querySelector(`#${WIDGET_ID}-footer`);

    if (!cards.length) {
      widget.style.display = "none";
      isWidgetVisible = false;
      setDotVisible(false);
      return;
    }

    if (isDndMode && !isDndPreview) {
      widget.style.display = "none";
      isWidgetVisible = false;
      setDotVisible(true);
    } else {
      widget.style.display = "block";
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
      body.textContent = "No card available.";
      footer.textContent = `${safeIndex + 1} / ${cards.length}`;
      return;
    }

    const cardKey = `${safeIndex}-${card.question || card.content}`;
    const state = cardState[cardKey] || { answered: false, correct: null, userAnswer: null };

    // Render based on card type
    if (card.type === "mcq") {
      const questionDiv = document.createElement("div");
      questionDiv.textContent = card.question;
      questionDiv.style.marginBottom = "10px";
      questionDiv.style.fontWeight = "bold";
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
            cardState[cardKey] = { answered: true, correct: isCorrect, userAnswer: option };
            currentCardInteracted = true;
            renderCurrentCard();
          });
          body.appendChild(btn);
        });

        const giveUpBtn = createInputButton("Give Up", "secondary");
        giveUpBtn.onclick = (e) => {
          e.stopPropagation();
          cardState[cardKey] = { answered: true, correct: false, userAnswer: null };
          currentCardInteracted = true;
          renderCurrentCard();
        };
        body.appendChild(giveUpBtn);
      }
    } else if (card.type === "fact") {
      const factDiv = document.createElement("div");
      factDiv.textContent = `Do you know: ${card.content}`;
      factDiv.style.marginBottom = "10px";
      factDiv.style.fontWeight = "500";
      body.appendChild(factDiv);

      if (!state.answered) {
        const yesBtn = createInputButton("Yes", "primary");
        yesBtn.onclick = (e) => {
          e.stopPropagation();
          cardState[cardKey] = { answered: true, correct: true, userAnswer: "yes" };
          currentCardInteracted = true;
          renderCurrentCard();
        };

        const noBtn = createInputButton("No", "secondary");
        noBtn.onclick = (e) => {
          e.stopPropagation();
          cardState[cardKey] = { answered: true, correct: false, userAnswer: "no" };
          currentCardInteracted = true;
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
      const questionDiv = document.createElement("div");
      questionDiv.textContent = card.question;
      questionDiv.style.marginBottom = "10px";
      questionDiv.style.fontWeight = "bold";
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
        submitBtn.onclick = (e) => {
          e.stopPropagation();
          const correctAns = normalizeAnswer(card.correct || card.answer || "");
          const userAns = normalizeAnswer(input.value);
          const isCorrect = userAns === correctAns;
          cardState[cardKey] = { answered: true, correct: isCorrect, userAnswer: input.value };
          currentCardInteracted = true;
          renderCurrentCard();
        };

        const giveUpBtn = createInputButton("Give Up", "secondary");
        giveUpBtn.onclick = (e) => {
          e.stopPropagation();
          cardState[cardKey] = { answered: true, correct: false, userAnswer: null };
          currentCardInteracted = true;
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
  }

  function triggerOnIdle() {
    if (!cards.length) {
      const widget = document.getElementById(WIDGET_ID);
      if (widget) {
        widget.style.display = "none";
      }
      isWidgetVisible = false;
      return;
    }

    if (currentCardInteracted) {
      // User already answered — advance to next card before showing
      index = (index + 1) % cards.length;
      cardState = {};
      currentCardInteracted = false;
      console.log(`[Recall Widget] Advancing to card ${index + 1}/${cards.length}`);
    } else if (isWidgetVisible) {
      console.log("[Recall Widget] Idle trigger ignored: waiting for current card interaction");
      return;
    }

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
    cards = Array.isArray(nextCards)
      ? nextCards.filter((card) => card && (card.question || card.content))
      : [];

    index = 0;
    cardState = {};
    currentCardInteracted = false;
    idleTriggered = false;
    lastUserActivityAt = Date.now();
    startIdleMonitor();
  }

  function loadCardsFromStorage() {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get([STORAGE_KEY, DND_MODE_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        return;
      }
      isDndMode = Boolean(result[DND_MODE_STORAGE_KEY]);
      updateDndButtonVisual();
      setCards(result[STORAGE_KEY]);
      applyDndModeUi();
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes[DND_MODE_STORAGE_KEY]) {
      isDndMode = Boolean(changes[DND_MODE_STORAGE_KEY].newValue);
      isDndPreview = false;
      updateDndButtonVisual();
      applyDndModeUi();
    }

    if (changes[STORAGE_KEY]) {
      setCards(changes[STORAGE_KEY].newValue);
      applyDndModeUi();
    }
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }

    const payload = event.data;
    if (!payload || payload.type !== DASHBOARD_SYNC_EVENT) {
      return;
    }

    const nextCards = Array.isArray(payload.cards) ? payload.cards : [];
    chrome.storage.local.set({ [STORAGE_KEY]: nextCards }, () => {
      if (chrome.runtime.lastError) {
        console.log("[Recall Widget] Failed to sync cards from dashboard");
        return;
      }
      console.log(`[Recall Widget] Synced ${nextCards.length} cards from dashboard`);
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      createWidget();
      loadCardsFromStorage();
    }, { once: true });
  } else {
    createWidget();
    loadCardsFromStorage();
  }
})();
