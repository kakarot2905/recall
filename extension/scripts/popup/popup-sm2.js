(() => {
    function sm2GetNextInterval(repetitions, easeFactor, prevInterval, quality) {
        if (quality < 3) return 600000;
        switch (repetitions) {
            case 0: return 600000;
            case 1: return 3600000;
            case 2: return 28800000;
            case 3: return 86400000;
            default: return Math.round(prevInterval * easeFactor);
        }
    }

    function sm2Calculate(cardState, quality) {
        let { easeFactor, repetitions, interval, stability } = cardState;
        const qualityHistory = Array.isArray(cardState.qualityHistory)
            ? cardState.qualityHistory.slice(-9)
            : [];

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
            qualityHistory: [...qualityHistory, { quality, reviewedAt: new Date().toISOString() }],
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
            qualityHistory: [],
        };
    }

    window.RecallSM2 = {
        sm2GetNextInterval,
        sm2Calculate,
        sm2DefaultState,
    };
})();
