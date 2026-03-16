(() => {
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

    window.RecallWidgetShared = {
        hashTopicColor,
        getTimeOfDay,
        getDaysUntilExam,
        widgetSM2GetNextInterval,
        widgetSM2Calculate,
        widgetSM2Default,
        widgetGetDueCards,
        getQueueCardKey,
    };
})();
