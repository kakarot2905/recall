(() => {
    const LOCAL_SNAPSHOT_REQUEST_EVENT = "RECALL_REQUEST_LOCAL_SNAPSHOT";
    const LOCAL_SNAPSHOT_REPLY_EVENT = "RECALL_LOCAL_SNAPSHOT";
    const DASHBOARD_SYNC_EVENT = "RECALL_SYNC_WIDGET_CARDS";

    const LOCAL_SNAPSHOT_STORAGE_KEYS = [
        "recallWidgetCards",
        "recallCards",
        "recallSM2State",
        "recallTodayStats",
        "recallCalibrationCompleted",
        "recallExamDate",
        "recallLastSourceId",
        "recallLastReviewedAt",
        "recallLastOpenedAt",
        "recallLastShownDate",
        "recallTopic",
        "recallWidgetPosition",
        "recallWidgetDotPosition",
        "recallWidgetDndMode",
        "recallAuthToken",
        "recallUser",
        "pulsedAt",
        "ghostCardShown",
        "seenFirstCardPerSource",
        "recallTopicColors",
    ];

    const DASHBOARD_BOOTSTRAP_STORAGE_KEYS = [
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

    function normalizeAnswer(text) {
        return String(text || "").toLowerCase().trim();
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
                    dp[i - 1][j - 1] + cost
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

    function clampPosition(left, top, width, height) {
        const maxLeft = Math.max(window.innerWidth - width, 0);
        const maxTop = Math.max(window.innerHeight - height, 0);

        return {
            left: Math.min(Math.max(left, 0), maxLeft),
            top: Math.min(Math.max(top, 0), maxTop),
        };
    }

    window.RecallWidgetRuntime = {
        LOCAL_SNAPSHOT_REQUEST_EVENT,
        LOCAL_SNAPSHOT_REPLY_EVENT,
        DASHBOARD_SYNC_EVENT,
        LOCAL_SNAPSHOT_STORAGE_KEYS,
        DASHBOARD_BOOTSTRAP_STORAGE_KEYS,
        normalizeAnswer,
        levenshtein,
        fuzzyMatch,
        semanticMatch,
        lerpColor,
        clampPosition,
    };
})();
