const sourcesBody = document.getElementById("sourcesBody");
const cardsContainer = document.getElementById("cardsContainer");
const sourceSummary = document.getElementById("sourceSummary");
const cardsSummary = document.getElementById("cardsSummary");
const userSummary = document.getElementById("userSummary");
const rawDataView = document.getElementById("rawDataView");
const refreshBtn = document.getElementById("refreshBtn");

const addSourceForm = document.getElementById("addSourceForm");
const addCardForm = document.getElementById("addCardForm");
const newSourceTopic = document.getElementById("newSourceTopic");
const newSourceNotes = document.getElementById("newSourceNotes");
const newSourceExamDate = document.getElementById("newSourceExamDate");

const newCardType = document.getElementById("newCardType");
const newCardDifficulty = document.getElementById("newCardDifficulty");
const newCardQuestion = document.getElementById("newCardQuestion");
const newCardContent = document.getElementById("newCardContent");
const newCardAnswer = document.getElementById("newCardAnswer");
const newCardOptions = document.getElementById("newCardOptions");
const newCardYoutube = document.getElementById("newCardYoutube");
const newCardGoogle = document.getElementById("newCardGoogle");

const retentionTopicSelect = document.getElementById("retentionTopicSelect");
const retentionStatus = document.getElementById("retentionStatus");
const {
    getTopics: retentionGetTopics,
    resolveExamDate,
    computeRetentionSeries,
    renderRetentionChart,
} = window.RecallDashboardRetention || {};

let currentRetentionData = null;

const DASHBOARD_SYNC_EVENT = "RECALL_SYNC_WIDGET_CARDS";
const snapshotHelpers = window.RecallDashboardSnapshot || {};
const escapeHtml = snapshotHelpers.escapeHtml || ((value) => String(value || ""));

const url = new URL(window.location.href);
const tokenFromUrl = url.searchParams.get("token");

if (tokenFromUrl) {
    sessionStorage.setItem("recallDashboardToken", tokenFromUrl);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + url.search);
}

const dashboardToken = sessionStorage.getItem("recallDashboardToken");

let selectedSourceId = "";
let cachedSources = [];
let cachedCards = [];
let dashboardUser = null;

async function api(path, options = {}) {
    const headers = {
        ...(options.headers || {}),
    };

    if (dashboardToken) {
        headers.Authorization = `Bearer ${dashboardToken}`;
    }

    const response = await fetch(path, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return date.toLocaleString();
}

function formatDateInput(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toISOString().slice(0, 10);
}

function syncCardsToExtensionStorage(cards) {
    if (!Array.isArray(cards)) {
        return;
    }

    window.postMessage(
        {
            type: DASHBOARD_SYNC_EVENT,
            cards,
        },
        window.location.origin,
    );
}

function getCardsForSelectedSource() {
    return cachedCards.filter(
        (card) => String(card.sourceId) === String(selectedSourceId),
    );
}

function renderRawData() {
    if (typeof snapshotHelpers.renderRawData !== "function") {
        rawDataView.textContent = "Snapshot helper unavailable.";
        return;
    }

    snapshotHelpers.renderRawData({
        cachedCards,
        cachedSources,
        dashboardUser,
        rawDataView,
    });
}

function logRetentionGraphValues(retentionData, selectedTopic = null) {
    if (!retentionData || !Array.isArray(retentionData.labels) || !retentionData.series) {
        return;
    }

    const topicsToLog = selectedTopic ? [selectedTopic] : Object.keys(retentionData.series);
    const payload = {};

    topicsToLog.forEach((topic) => {
        const values = retentionData.series[topic];
        if (!Array.isArray(values)) {
            return;
        }

        payload[topic] = retentionData.labels.map((label, idx) => ({
            date: label,
            retention: values[idx],
        }));
    });

    console.log("[Recall Dashboard] Retention graph values:", payload);
}

async function renderRetentionGraph() {
    if (!dashboardToken) return;

    retentionStatus.textContent = "Loading...";
    retentionTopicSelect.innerHTML = '<option value="">All Topics</option>';
    currentRetentionData = null;

    try {
        const progressPayload = await api("/api/progress");
        const sm2State = progressPayload.sm2State || {};

        const topics = retentionGetTopics(cachedCards, sm2State, cachedSources);

        if (!topics.length) {
            retentionStatus.textContent =
                "No reviewed cards yet. Complete a calibration quiz to see your curves.";
            return;
        }

        topics.forEach(topic => {
            const opt = document.createElement("option");
            opt.value = topic;
            opt.textContent = topic;
            retentionTopicSelect.appendChild(opt);
        });

        const examDate = resolveExamDate(cachedSources);
        currentRetentionData = computeRetentionSeries(cachedCards, sm2State, examDate, cachedSources);
        retentionStatus.textContent = "";
        renderRetentionChart("retentionCanvas", currentRetentionData, null);
        logRetentionGraphValues(currentRetentionData, null);
    } catch (err) {
        retentionStatus.textContent = "Failed to load retention data.";
        console.error("[Recall Dashboard] Retention graph error:", err);
    }
}

function renderSources() {
    sourceSummary.textContent = `${cachedSources.length} source(s)`;

    if (!cachedSources.length) {
        sourcesBody.innerHTML =
            '<tr><td colspan="5" class="muted">No sources yet.</td></tr>';
        return;
    }

    sourcesBody.innerHTML = cachedSources
        .map((source) => {
            const isSelected = source._id === selectedSourceId ? "selected" : "";
            return `
        <tr class="${isSelected}" data-source-id="${source._id}">
          <td>
            <div><strong>${escapeHtml(source.topic)}</strong></div>
            <div class="muted">${escapeHtml(source.notes || "")}</div>
          </td>
          <td><span class="status ${escapeHtml(source.status)}">${escapeHtml(source.status)}</span></td>
          <td>${escapeHtml(source.cardCount || 0)}</td>
          <td>${escapeHtml(formatDate(source.examDate))}</td>
          <td>
            <button type="button" class="button button-small" data-edit-source-id="${source._id}">Edit</button>
            <button type="button" class="button button-small button-danger" data-delete-source-id="${source._id}">Delete</button>
          </td>
        </tr>
      `;
        })
        .join("");

    sourcesBody.querySelectorAll("tr[data-source-id]").forEach((row) => {
        row.addEventListener("click", (event) => {
            if (event.target.closest("button")) {
                return;
            }

            selectedSourceId = row.getAttribute("data-source-id") || "";
            renderSources();
            renderCards();
            renderRawData();
        });
    });

    sourcesBody.querySelectorAll("[data-delete-source-id]").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.stopPropagation();
            const sourceId = button.getAttribute("data-delete-source-id");
            if (!sourceId) {
                return;
            }

            const confirmed = window.confirm("Delete this source and all its cards?");
            if (!confirmed) {
                return;
            }

            try {
                await api(`/api/sources/${sourceId}`, { method: "DELETE" });
                if (sourceId === selectedSourceId) {
                    selectedSourceId = "";
                }
                await loadDashboardData();
            } catch (error) {
                sourceSummary.textContent = error.message || "Failed to delete source";
            }
        });
    });

    sourcesBody.querySelectorAll("[data-edit-source-id]").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.stopPropagation();
            const sourceId = button.getAttribute("data-edit-source-id");
            const source = cachedSources.find((item) => item._id === sourceId);
            if (!source) {
                return;
            }

            const nextTopic = window.prompt("Topic", source.topic || "");
            if (nextTopic === null) {
                return;
            }

            const nextNotes = window.prompt("Notes", source.notes || "") ?? source.notes;
            const nextExamDate = window.prompt(
                "Exam date (YYYY-MM-DD or empty)",
                formatDateInput(source.examDate),
            );
            if (nextExamDate === null) {
                return;
            }

            const nextStatus = window.prompt(
                "Status (pending, processing, done, failed)",
                source.status || "done",
            );
            if (nextStatus === null) {
                return;
            }

            try {
                await api(`/api/sources/${sourceId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        topic: nextTopic,
                        notes: nextNotes,
                        examDate: nextExamDate || null,
                        status: nextStatus,
                    }),
                });

                await loadDashboardData();
            } catch (error) {
                sourceSummary.textContent = error.message || "Failed to update source";
            }
        });
    });
}

function renderCards() {
    const cards = getCardsForSelectedSource();
    cardsSummary.textContent = selectedSourceId
        ? `${cards.length} card(s) in selected source`
        : "Pick a source to manage cards.";

    const source = cachedSources.find((item) => item._id === selectedSourceId);
    const cardsForWidget = cards.map((card) => ({
        ...card,
        sourceId: String(card.sourceId || ""),
        topic: source?.topic || "",
    }));
    syncCardsToExtensionStorage(cardsForWidget);

    if (!selectedSourceId) {
        cardsContainer.innerHTML =
            '<div class="muted">Select a source from the left panel.</div>';
        return;
    }

    if (!cards.length) {
        cardsContainer.innerHTML =
            '<div class="muted">No cards for this source yet.</div>';
        return;
    }

    cardsContainer.innerHTML = cards
        .map((card) => {
            const prompt = card.question || card.content || "-";
            const answer = card.correct || card.answer || "";
            const options = Array.isArray(card.options) ? card.options : [];
            return `
        <article class="card-item" data-card-id="${card._id}">
          <div class="card-head">
            <div>
              <span class="chip">${escapeHtml(card.type)}</span>
              <span class="chip">Difficulty ${escapeHtml(card.difficulty || 3)}</span>
            </div>
            <div>
              <button type="button" class="button button-small" data-edit-card-id="${card._id}">Edit</button>
              <button type="button" class="button button-small button-danger" data-delete-card-id="${card._id}">Delete</button>
            </div>
          </div>
          <p><strong>${escapeHtml(prompt)}</strong></p>
          ${options.length ? `<p class="muted">Options: ${escapeHtml(options.join(" | "))}</p>` : ""}
          ${answer ? `<p class="muted">Answer: ${escapeHtml(answer)}</p>` : ""}
          ${card.youtubeQuery ? `<p class="muted">YouTube: ${escapeHtml(card.youtubeQuery)}</p>` : ""}
          ${card.googleQuery ? `<p class="muted">Google: ${escapeHtml(card.googleQuery)}</p>` : ""}
        </article>
      `;
        })
        .join("");

    cardsContainer.querySelectorAll("[data-delete-card-id]").forEach((button) => {
        button.addEventListener("click", async () => {
            const cardId = button.getAttribute("data-delete-card-id");
            if (!cardId) {
                return;
            }

            const confirmed = window.confirm("Delete this card?");
            if (!confirmed) {
                return;
            }

            try {
                await api(`/api/cards/${cardId}`, { method: "DELETE" });
                await loadDashboardData();
            } catch (error) {
                cardsSummary.textContent = error.message || "Failed to delete card";
            }
        });
    });

    cardsContainer.querySelectorAll("[data-edit-card-id]").forEach((button) => {
        button.addEventListener("click", async () => {
            const cardId = button.getAttribute("data-edit-card-id");
            const card = cards.find((item) => item._id === cardId);
            if (!card) {
                return;
            }

            const type = window.prompt(
                "Type (mcq, short_answer, fill_blank, fact)",
                card.type || "mcq",
            );
            if (type === null) {
                return;
            }

            const difficulty = window.prompt(
                "Difficulty (1-5)",
                String(card.difficulty || 3),
            );
            if (difficulty === null) {
                return;
            }

            const question = window.prompt("Question", card.question || "");
            if (question === null) {
                return;
            }

            const content = window.prompt("Content (fact cards)", card.content || "");
            if (content === null) {
                return;
            }

            const answer = window.prompt(
                "Answer / Correct",
                card.correct || card.answer || "",
            );
            if (answer === null) {
                return;
            }

            const options = window.prompt(
                "Options CSV",
                Array.isArray(card.options) ? card.options.join(", ") : "",
            );
            if (options === null) {
                return;
            }

            const youtubeQuery = window.prompt("YouTube query", card.youtubeQuery || "");
            if (youtubeQuery === null) {
                return;
            }

            const googleQuery = window.prompt("Google query", card.googleQuery || "");
            if (googleQuery === null) {
                return;
            }

            try {
                await api(`/api/cards/${cardId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type,
                        difficulty,
                        question,
                        content,
                        correct: answer,
                        answer,
                        options,
                        youtubeQuery,
                        googleQuery,
                    }),
                });
                await loadDashboardData();
            } catch (error) {
                cardsSummary.textContent = error.message || "Failed to update card";
            }
        });
    });
}

async function loadDashboardData() {
    sourceSummary.textContent = "Loading sources...";
    cardsSummary.textContent = "Loading cards...";
    rawDataView.textContent = "Fetching dashboard data...";

    const payload = await api("/api/dashboard-data");
    dashboardUser = payload.user || null;
    cachedSources = Array.isArray(payload.sources) ? payload.sources : [];
    cachedCards = Array.isArray(payload.cards) ? payload.cards : [];

    if (dashboardUser) {
        userSummary.textContent = `Logged in as ${dashboardUser.name || "User"} (${dashboardUser.email || ""})`;
    }

    if (!selectedSourceId && cachedSources.length) {
        selectedSourceId = cachedSources[0]._id;
    }

    if (
        selectedSourceId &&
        !cachedSources.some((source) => source._id === selectedSourceId)
    ) {
        selectedSourceId = cachedSources.length ? cachedSources[0]._id : "";
    }

    renderSources();
    renderCards();
    renderRawData();
    renderRetentionGraph();
}

addSourceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!newSourceTopic.value.trim()) {
        sourceSummary.textContent = "Topic is required";
        return;
    }

    try {
        await api("/api/sources/manual", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic: newSourceTopic.value.trim(),
                notes: newSourceNotes.value.trim(),
                examDate: newSourceExamDate.value || null,
            }),
        });

        newSourceTopic.value = "";
        newSourceNotes.value = "";
        newSourceExamDate.value = "";
        await loadDashboardData();
    } catch (error) {
        sourceSummary.textContent = error.message || "Failed to add source";
    }
});

addCardForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedSourceId) {
        cardsSummary.textContent = "Select a source before adding cards.";
        return;
    }

    try {
        await api(`/api/sources/${selectedSourceId}/cards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: newCardType.value,
                difficulty: newCardDifficulty.value,
                question: newCardQuestion.value,
                content: newCardContent.value,
                correct: newCardAnswer.value,
                answer: newCardAnswer.value,
                options: newCardOptions.value,
                youtubeQuery: newCardYoutube.value,
                googleQuery: newCardGoogle.value,
            }),
        });

        newCardQuestion.value = "";
        newCardContent.value = "";
        newCardAnswer.value = "";
        newCardOptions.value = "";
        newCardYoutube.value = "";
        newCardGoogle.value = "";
        await loadDashboardData();
    } catch (error) {
        cardsSummary.textContent = error.message || "Failed to add card";
    }
});

async function init() {
    try {
        if (!dashboardToken) {
            sourceSummary.textContent =
                "Missing auth token. Open dashboard from extension popup.";
            cardsSummary.textContent = "";
            rawDataView.textContent = JSON.stringify(
                {
                    status: "error",
                    message: "Missing auth token. Open dashboard from extension popup.",
                },
                null,
                2,
            );
            return;
        }

        await loadDashboardData();
    } catch (error) {
        sourceSummary.textContent = error.message || "Failed to load dashboard data";
        cardsSummary.textContent = "";
        rawDataView.textContent = JSON.stringify(
            {
                status: "error",
                message: error.message || "Failed to load dashboard data",
            },
            null,
            2,
        );
    }
}

refreshBtn.addEventListener("click", () => {
    init();
});

retentionTopicSelect.addEventListener("change", () => {
    if (!currentRetentionData) return;
    const selected = retentionTopicSelect.value || null;
    renderRetentionChart("retentionCanvas", currentRetentionData, selected);
    logRetentionGraphValues(currentRetentionData, selected);
});

init();
