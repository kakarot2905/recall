(() => {
    function normalizeAnswer(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizeText(value) {
        return normalizeAnswer(value);
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

    window.RecallTextUtils = {
        normalizeAnswer,
        normalizeText,
        levenshtein,
        fuzzyMatch,
    };
})();
