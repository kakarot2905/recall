(() => {
    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function computeDaysAway(dateValue) {
        if (!dateValue) return null;
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return null;
        return Math.ceil((d.getTime() - Date.now()) / 86400000);
    }

    function countCardTypes(cards) {
        const counts = {
            mcq: 0,
            short_answer: 0,
            fill_blank: 0,
            fact: 0,
        };
        for (const card of Array.isArray(cards) ? cards : []) {
            if (counts[card?.type] !== undefined) {
                counts[card.type] += 1;
            }
        }
        return counts;
    }

    function cardTypeBreakdownText(counts) {
        return `mcq: ${counts.mcq}, short_answer: ${counts.short_answer}, fill_blank: ${counts.fill_blank}, fact: ${counts.fact}`;
    }

    function snapRow(label, valueHtml) {
        return `<div class="snap-row"><span class="snap-key">${escapeHtml(label)}</span>${valueHtml}</div>`;
    }

    function snapVal(text) {
        return `<span class="snap-val">${escapeHtml(String(text))}</span>`;
    }

    function snapMono(text) {
        return `<span class="snap-val snap-mono">${escapeHtml(String(text))}</span>`;
    }

    function snapEmpty(text) {
        return `<span class="snap-empty">${escapeHtml(text)}</span>`;
    }

    function renderDaysAwayChip(dateValue) {
        const days = computeDaysAway(dateValue);
        if (days === null) {
            return snapEmpty("—");
        }
        if (days === 0) {
            return '<span class="chip" style="color:var(--warn);border-color:#e9cc95;background:#fff8eb">today</span>';
        }
        if (days < 0) {
            const label = `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
            return `<span class="chip" style="opacity:0.7">${escapeHtml(label)}</span>`;
        }

        const label = `${days} day${days === 1 ? "" : "s"} away`;
        if (days <= 2) {
            return `<span class="chip" style="color:var(--error);border-color:#f1b7b5;background:#fff5f4">${escapeHtml(label)}</span>`;
        }
        if (days <= 14) {
            return `<span class="chip" style="color:var(--warn);border-color:#e9cc95;background:#fff8eb">${escapeHtml(label)}</span>`;
        }
        return `<span class="chip" style="opacity:0.7">${escapeHtml(label)}</span>`;
    }

    function renderExamDateWithChip(dateValue) {
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) {
            return snapEmpty("—");
        }
        return `${snapVal(d.toLocaleDateString())} ${renderDaysAwayChip(dateValue)}`;
    }

    function safeStatusClass(status) {
        const next = String(status || "").toLowerCase();
        return ["pending", "processing", "done", "failed"].includes(next)
            ? next
            : "pending";
    }

    function snapTimeAgo(date) {
        const secs = Math.floor((Date.now() - date) / 1000);
        if (secs < 60) return `${secs}s ago`;
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }

    function snapFormatTs(value) {
        if (!value) return '<span class="snap-empty">\u2014</span>';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
            return `<span class="snap-val">${escapeHtml(String(value))}</span>`;
        }
        return `<span class="snap-val">${d.toLocaleString()}</span> <span class="snap-ts">(${snapTimeAgo(d)})</span>`;
    }

    function renderRawData({ cachedCards, cachedSources, dashboardUser, rawDataView }) {
        const allCardsBySource = {};
        for (const card of cachedCards) {
            const sourceId = String(card?.sourceId || "");
            if (!allCardsBySource[sourceId]) {
                allCardsBySource[sourceId] = [];
            }
            allCardsBySource[sourceId].push(card);
        }

        const totalCardTypes = countCardTypes(cachedCards);
        let html = "";

        html += '<div class="snap-section"><div class="snap-section-title">Account</div><div class="snap-section-body">';
        const userName = dashboardUser?.name || "User";
        const userEmail = dashboardUser?.email || "—";
        html += snapRow(
            "User",
            snapVal(`${userName}${userEmail !== "—" ? ` (${userEmail})` : ""}`),
        );
        html += snapRow("Total Sources", snapVal(cachedSources.length));
        html += snapRow(
            "Total Cards",
            `${snapVal(cachedCards.length)} <span class="snap-ts">${escapeHtml(cardTypeBreakdownText(totalCardTypes))}</span>`,
        );
        html += "</div></div>";

        if (!cachedSources.length) {
            html += '<div class="snap-section"><div class="snap-section-title">Sources</div><div class="snap-section-body"><div class="snap-empty">No sources yet.</div></div></div>';
            rawDataView.innerHTML = html;
            return;
        }

        for (const source of cachedSources) {
            const sourceCards = allCardsBySource[String(source?._id || "")] || [];
            const typeCounts = countCardTypes(sourceCards);
            const notesText = String(source?.notes || "").trim();
            const notesPreview = notesText.length > 80 ? `${notesText.slice(0, 80)}...` : notesText;
            const sourceId = String(source?._id || "");

            html += '<div class="snap-section">';
            html += `<div class="snap-section-title" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><span><strong>${escapeHtml(source?.topic || "Untitled")}</strong> <span class="status ${safeStatusClass(source?.status)}">${escapeHtml(source?.status || "pending")}</span></span><span class="chip">${sourceCards.length} card(s)</span></div>`;
            html += '<div class="snap-section-body">';
            html += snapRow("Source ID", sourceId ? snapMono(sourceId.slice(-8)) : snapEmpty("—"));
            html += snapRow("Exam Date", renderExamDateWithChip(source?.examDate));
            html += snapRow("Notes preview", notesPreview ? snapVal(notesPreview) : snapEmpty("—"));
            html += snapRow("Card Types", `<span class="snap-ts">${escapeHtml(cardTypeBreakdownText(typeCounts))}</span>`);
            html += snapRow("Created", snapFormatTs(source?.createdAt));
            html += "</div></div>";
        }

        rawDataView.innerHTML = html;
    }

    function renderLocalSnapshot(data, localDataView) {
        const sections = [];

        const user = data.recallUser;
        const token = data.recallAuthToken;
        let userHtml = "";
        if (user && typeof user === "object") {
            userHtml += snapRow("Name", snapVal(user.name || user.displayName || "—"));
            userHtml += snapRow("Email", snapVal(user.email || "—"));
            if (user.plan) userHtml += snapRow("Plan", snapVal(user.plan));
            if (user._id) userHtml += snapRow("User ID", snapMono(user._id));
        } else {
            userHtml += '<div class="snap-empty">Not logged in</div>';
        }
        if (token) {
            const masked = typeof token === "string" ? token.slice(0, 12) + "…" : "(set)";
            userHtml += snapRow("Auth Token", `<span class="snap-val snap-mono snap-muted">${escapeHtml(masked)}</span>`);
        }
        sections.push({ title: "User & Auth", body: userHtml });

        const stats = data.recallTodayStats;
        const calibrationDone = Boolean(data.recallCalibrationCompleted);
        const todayCount = stats && typeof stats === "object" ? (stats.count ?? 0) : 0;
        const todayCorrect = stats && typeof stats === "object" ? (stats.correct ?? "—") : "—";
        const todayStreak = stats && typeof stats === "object" ? (stats.streak ?? "—") : "—";
        const statsDate = stats && typeof stats === "object" && stats.date ? String(stats.date) : "—";

        let progressHtml = "";
        progressHtml += snapRow("Calibration", `<span class="snap-val" style="color:${calibrationDone ? "var(--ok)" : "var(--warn)"};font-weight:600">${calibrationDone ? "✓ Complete" : "Pending"}</span>`);
        progressHtml += snapRow("Last Topic", data.recallTopic ? snapVal(data.recallTopic) : snapEmpty("—"));
        progressHtml += snapRow("Today Answered", `${snapVal(todayCount)} <span class="snap-ts">(${escapeHtml(statsDate)})</span>`);
        progressHtml += snapRow("Today Correct", snapVal(todayCorrect));
        progressHtml += snapRow("Streak", snapVal(todayStreak));
        sections.push({ title: "Learning Progress", body: progressHtml });

        let scheduleHtml = "";
        scheduleHtml += snapRow("Exam Date", renderExamDateWithChip(data.recallExamDate));
        scheduleHtml += snapRow("Last Source ID", data.recallLastSourceId ? snapMono(data.recallLastSourceId) : snapEmpty("—"));

        const sm2 = data.recallSM2State;
        if (sm2 && typeof sm2 === "object") {
            const entries = Object.entries(sm2);
            const now = new Date();
            const dueSoon = entries.filter(([, s]) => s && s.nextReview && new Date(s.nextReview) <= now);
            scheduleHtml += snapRow("Card States Tracked", snapVal(entries.length));
            scheduleHtml += snapRow("Due Now", `<span class="snap-val" style="color:${dueSoon.length > 0 ? "var(--error)" : "var(--ok)"}">${dueSoon.length}</span>`);

            if (entries.length > 0) {
                const sorted = [...entries].sort((a, b) => new Date((a[1] && a[1].nextReview) || 0) - new Date((b[1] && b[1].nextReview) || 0));
                scheduleHtml += `<details class="snap-details"><summary>${entries.length} state(s) — click to expand (sorted by next review)</summary><div class="snap-list">`;
                for (const [id, s] of sorted) {
                    const nr = s && s.nextReview ? new Date(s.nextReview).toLocaleDateString() : "—";
                    const isDue = s && s.nextReview && new Date(s.nextReview) <= now;
                    const dueChip = isDue ? ' <span class="chip" style="background:#fff5f4;border-color:#f1b7b5;color:#8f1f1b">due</span>' : "";
                    scheduleHtml += `<div class="snap-list-item"><span class="snap-mono" style="font-size:11px;color:var(--muted)">${escapeHtml(id.slice(-8))}</span> &nbsp; rep&nbsp;<b>${(s && s.repetitions) ?? 0}</b> &middot; EF&nbsp;<b>${((s && s.easeFactor) ?? 2.5).toFixed(2)}</b> &middot; interval&nbsp;<b>${(s && s.interval) ?? 0}d</b> &middot; next&nbsp;<b>${nr}</b>${dueChip}</div>`;
                }
                scheduleHtml += "</div></details>";
            }
        } else {
            scheduleHtml += '<div class="snap-empty">No SM-2 state recorded yet.</div>';
        }
        sections.push({ title: "Exam & Scheduling", body: scheduleHtml });

        let settingsHtml = "";
        settingsHtml += snapRow("DND Mode", snapVal(data.recallWidgetDndMode ? "Enabled" : "Disabled"));

        function renderPositionValue(position) {
            if (!position || typeof position !== "object") {
                return snapEmpty("—");
            }
            const left = Number(position.left ?? position.x);
            const top = Number(position.top ?? position.y);
            if (Number.isNaN(left) || Number.isNaN(top)) {
                return snapEmpty("—");
            }
            return snapMono(`left: ${left}px, top: ${top}px`);
        }

        settingsHtml += snapRow("Widget Position", renderPositionValue(data.recallWidgetPosition));
        settingsHtml += snapRow("Dot Position", renderPositionValue(data.recallWidgetDotPosition));
        settingsHtml += snapRow("Last Shown Date", data.recallLastShownDate ? snapVal(data.recallLastShownDate) : snapEmpty("—"));

        const ghostEntries = data.ghostCardShown && typeof data.ghostCardShown === "object" ? Object.values(data.ghostCardShown) : [];
        const ghostCount = ghostEntries.filter(Boolean).length;
        settingsHtml += snapRow("Ghost Card Shown", snapVal(`${ghostCount} source${ghostCount === 1 ? "" : "s"}`));

        const seenEntries = data.seenFirstCardPerSource && typeof data.seenFirstCardPerSource === "object" ? Object.values(data.seenFirstCardPerSource) : [];
        const seenCount = seenEntries.filter(Boolean).length;
        settingsHtml += snapRow("Seen First Card", snapVal(`${seenCount} source${seenCount === 1 ? "" : "s"}`));

        const colors = data.recallTopicColors;
        if (colors && typeof colors === "object" && Object.keys(colors).length > 0) {
            settingsHtml += '<div class="snap-row" style="align-items:flex-start;flex-direction:column;gap:4px"><span class="snap-key">Topic Colors</span>';
            for (const [topic, color] of Object.entries(colors)) {
                settingsHtml += `<div class="snap-row snap-indent" style="width:100%"><span class="snap-key">${escapeHtml(topic)}</span><span class="snap-color-dot" style="background:${escapeHtml(color)}"></span><span class="snap-val snap-mono">${escapeHtml(color)}</span></div>`;
            }
            settingsHtml += "</div>";
        } else {
            settingsHtml += snapRow("Topic Colors", snapEmpty("none set"));
        }
        sections.push({ title: "Widget & UI State", body: settingsHtml });

        const indexedDbCards = Array.isArray(data.recallCards) ? data.recallCards : [];
        const widgetCards = Array.isArray(data.recallWidgetCards) ? data.recallWidgetCards : [];
        const indexedDbCounts = countCardTypes(indexedDbCards);
        const widgetCounts = countCardTypes(widgetCards);
        const sourceIdSet = new Set(widgetCards.map((card) => String(card?.sourceId || "")).filter(Boolean));

        let cardsHtml = "";
        cardsHtml += snapRow("IndexedDB Cards (recallCards)", `${snapVal(indexedDbCards.length)} <span class="snap-ts">${escapeHtml(cardTypeBreakdownText(indexedDbCounts))}</span>`);
        cardsHtml += snapRow("Widget Cache (recallWidgetCards)", `${snapVal(widgetCards.length)} <span class="snap-ts">${escapeHtml(cardTypeBreakdownText(widgetCounts))}</span>`);
        cardsHtml += snapRow("Sources with Cached Cards", snapVal(sourceIdSet.size));

        if (widgetCards.length > 0) {
            const sortedByType = [...widgetCards].sort((a, b) => String(a?.type || "").localeCompare(String(b?.type || "")));
            cardsHtml += `<details class="snap-details"><summary>${widgetCards.length} widget card(s) — click to expand (sorted by type)</summary><div class="snap-list">`;
            for (const card of sortedByType) {
                const typeChip = `<span class="chip">${escapeHtml(card?.type || "?")}</span>`;
                const src = card?.sourceId ? `src:${String(card.sourceId).slice(-8)}` : "src:—";
                const prompt = String(card?.question || card?.content || "(no question)");
                const preview = prompt.length > 90 ? `${prompt.slice(0, 90)}...` : prompt;
                cardsHtml += `<div class="snap-list-item">${typeChip} <span class="snap-mono" style="font-size:11px;color:var(--muted)">${escapeHtml(src)}</span> ${escapeHtml(preview)}</div>`;
            }
            cardsHtml += "</div></details>";
        } else {
            cardsHtml += '<div class="snap-empty">No widget cards cached.</div>';
        }
        sections.push({ title: "Card Cache", body: cardsHtml });

        let activityHtml = "";
        activityHtml += `<div class="snap-row"><span class="snap-key">Last Reviewed</span>${snapFormatTs(data.recallLastReviewedAt)}</div>`;
        activityHtml += `<div class="snap-row"><span class="snap-key">Last Opened</span>${snapFormatTs(data.recallLastOpenedAt)}</div>`;
        activityHtml += `<div class="snap-row"><span class="snap-key">Pulsed At</span>${snapFormatTs(data.pulsedAt)}</div>`;
        sections.push({ title: "Activity", body: activityHtml });

        localDataView.innerHTML = sections
            .map((s) => `<div class="snap-section"><div class="snap-section-title">${escapeHtml(s.title)}</div><div class="snap-section-body">${s.body}</div></div>`)
            .join("");
    }

    window.RecallDashboardSnapshot = {
        escapeHtml,
        countCardTypes,
        cardTypeBreakdownText,
        renderRawData,
        renderLocalSnapshot,
    };
})();
