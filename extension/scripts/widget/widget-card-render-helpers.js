(() => {
    function ensureCardEffectsStyle() {
        const CARD_EFFECTS_STYLE_ID = "recall-widget-card-effects";
        if (document.getElementById(CARD_EFFECTS_STYLE_ID)) {
            return;
        }

        const cardEffectsStyle = document.createElement("style");
        cardEffectsStyle.id = CARD_EFFECTS_STYLE_ID;
        cardEffectsStyle.textContent = "@keyframes recallCardBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.003)} } @keyframes recallSkeletonShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }";
        (document.head || document.documentElement).appendChild(cardEffectsStyle);
    }

    function getAnimationSpeed(widget) {
        return parseFloat(widget?.style.getPropertyValue("--recall-anim-speed") || "1") || 1;
    }

    function applyBodyAnimation(widget, widgetId) {
        const body = widget?.querySelector(`#${widgetId}-body`);
        if (!body) {
            return;
        }

        const speed = getAnimationSpeed(widget);
        body.style.animation = widget.matches(":hover")
            ? "none"
            : `recallCardBreathe ${3 * speed}s ease-in-out infinite`;
    }

    function bindBodyHoverAnimation(widget, widgetId) {
        if (!widget || widget.dataset.recallCardHoverBound) {
            return;
        }

        widget.addEventListener("mouseenter", () => {
            const nextBody = widget.querySelector(`#${widgetId}-body`);
            if (nextBody) {
                nextBody.style.animation = "none";
            }
        });

        widget.addEventListener("mouseleave", () => {
            applyBodyAnimation(widget, widgetId);
        });

        widget.dataset.recallCardHoverBound = "true";
    }

    function applyExamSpeed(widget, widgetId, safeStorageGet, getDaysUntilExam) {
        if (!widget || typeof safeStorageGet !== "function" || typeof getDaysUntilExam !== "function") {
            return;
        }

        safeStorageGet(["recallExamDate"], {}, (result) => {
            const daysUntilExam = getDaysUntilExam(result.recallExamDate || null);
            widget.style.setProperty("--recall-anim-speed", daysUntilExam !== null && daysUntilExam >= 1 && daysUntilExam <= 7 ? "1.18" : "1");
            applyBodyAnimation(widget, widgetId);
        });
    }

    function showSkeleton(body, widget) {
        if (!body) {
            return;
        }

        const speed = getAnimationSpeed(widget);
        const skeleton = document.createElement("div");
        skeleton.id = "recall-card-widget-skeleton";
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
    }

    function hideSkeleton(body) {
        const skeleton = body?.querySelector("#recall-card-widget-skeleton");
        if (skeleton) {
            skeleton.remove();
        }
    }

    function buildResourceButtons(card) {
        const resourceButtons = document.createElement("div");
        resourceButtons.style.display = "flex";
        resourceButtons.style.alignItems = "center";
        resourceButtons.style.gap = "5px";

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
            ytBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
            ytBtn.onmouseover = () => {
                ytBtn.style.background = "#fddede";
            };
            ytBtn.onmouseout = () => {
                ytBtn.style.background = "#fff0f0";
            };
            resourceButtons.appendChild(ytBtn);
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
            gBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
            gBtn.onmouseover = () => {
                gBtn.style.background = "#dde8ff";
            };
            gBtn.onmouseout = () => {
                gBtn.style.background = "#f0f4ff";
            };
            resourceButtons.appendChild(gBtn);
        }

        return resourceButtons.hasChildNodes() ? resourceButtons : null;
    }

    window.RecallWidgetCardRenderHelpers = {
        ensureCardEffectsStyle,
        applyBodyAnimation,
        bindBodyHoverAnimation,
        applyExamSpeed,
        showSkeleton,
        hideSkeleton,
        buildResourceButtons,
    };
})();
