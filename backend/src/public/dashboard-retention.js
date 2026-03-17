/* dashboard-retention.js — retention math + Chart.js rendering for Recall dashboard */
; (function () {
    'use strict'

    // ---------------------------------------------------------------------------
    // CONSTANTS
    // ---------------------------------------------------------------------------

    const DAYS_PAST = 7
    const PALETTE = ['#C5BAFF', '#7EC8E3', '#A8D5A2', '#FFB347', '#FF9AA2', '#B5EAD7']
    const CHART_INSTANCE_KEY = '__recallDashboardRetentionChart'

    // ---------------------------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------------------------

    function mean(arr) {
        if (!arr.length) return 0
        return arr.reduce((sum, v) => sum + v, 0) / arr.length
    }

    function buildSourceTopicMap(sources) {
        const map = {}
        for (const source of (Array.isArray(sources) ? sources : [])) {
            if (source && source._id) {
                map[String(source._id)] = source.topic || String(source._id)
            }
        }
        return map
    }

    function topicForCard(card, sourceTopicMap) {
        if (card.topic) return card.topic
        const sid = card.sourceId != null ? String(card.sourceId) : null
        if (!sid) return 'Unknown'
        return (sourceTopicMap && sourceTopicMap[sid]) || sid
    }

    function isReviewed(sm2State, id) {
        const key = String(id)
        return (
            key in sm2State &&
            sm2State[key].lastReviewed != null &&
            typeof sm2State[key].lastReviewed === 'string'
        )
    }

    // ---------------------------------------------------------------------------
    // TOPIC EXTRACTION
    // ---------------------------------------------------------------------------

    /**
     * Returns unique topic strings (sorted alphabetically) for cards that have
     * been reviewed at least once (present in sm2State with a lastReviewed date).
     *
     * @param {Array}  cards     - array of card objects
     * @param {Object} sm2State  - map of card._id → SM-2 state
     * @returns {string[]}
     */
    function getTopics(cards, sm2State, sources) {
        const sourceTopicMap = buildSourceTopicMap(sources)
        const topics = new Set()
        for (const card of cards) {
            if (isReviewed(sm2State, String(card._id))) {
                topics.add(topicForCard(card, sourceTopicMap))
            }
        }
        return Array.from(topics).sort()
    }

    // ---------------------------------------------------------------------------
    // EXAM DATE RESOLUTION
    // ---------------------------------------------------------------------------

    /**
     * Returns the earliest future examDate across all sources, or null.
     *
     * @param {Array} sources - array of source objects (each may have .examDate)
     * @returns {Date|null}
     */
    function resolveExamDate(sources) {
        const now = Date.now()
        let earliest = null

        for (const source of sources) {
            if (!source.examDate) continue
            const d = new Date(source.examDate)
            if (isNaN(d.getTime())) continue
            if (d.getTime() <= now) continue
            if (earliest === null || d < earliest) {
                earliest = d
            }
        }

        return earliest
    }

    // ---------------------------------------------------------------------------
    // RETENTION CALCULATION
    // ---------------------------------------------------------------------------

    /**
     * Computes per-topic retention series over a date range.
     *
     * @param {Array}   cards     - array of card objects
     * @param {Object}  sm2State  - map of card._id → SM-2 state
     * @param {Date|null} examDate - resolved exam date (or null)
     * @returns {{ days: Date[], dayOffsets: number[], labels: string[], series: Object }}
     */
    function computeRetentionSeries(cards, sm2State, examDate, sources) {
        const sourceTopicMap = buildSourceTopicMap(sources)
        // Build X-axis day array
        const todayMidnight = new Date()
        todayMidnight.setHours(0, 0, 0, 0)

        const start = new Date(todayMidnight)
        start.setDate(start.getDate() - DAYS_PAST)

        const endFallback = new Date(todayMidnight)
        endFallback.setDate(endFallback.getDate() + 7)

        const isValidFutureDate = examDate instanceof Date && !isNaN(examDate.getTime()) && examDate > todayMidnight
        const end = isValidFutureDate ? examDate : endFallback

        const days = []
        const cursor = new Date(start)
        while (cursor <= end) {
            days.push(new Date(cursor))
            cursor.setDate(cursor.getDate() + 1)
        }

        const todayMs = todayMidnight.getTime()
        const dayOffsets = days.map(d => Math.round((d.getTime() - todayMs) / 86400000))
        const labels = days.map(d =>
            d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        )

        // Group cards by topic (reviewed cards only)
        const byTopic = {}
        for (const card of cards) {
            if (!isReviewed(sm2State, String(card._id))) continue
            const topic = topicForCard(card, sourceTopicMap)
            if (!byTopic[topic]) byTopic[topic] = []
            byTopic[topic].push(card)
        }

        const series = {}

        for (const [topic, topicCards] of Object.entries(byTopic)) {
            if (!topicCards.length) continue

            const retentionValues = days.map(day => {
                const dayMs = day.getTime()

                const perCard = topicCards
                    .map(card => {
                        const state = sm2State[String(card._id)]
                        const lastReviewedMs = new Date(state.lastReviewed).getTime()

                        // Compare using end-of-day so a card reviewed at any point
                        // during day D is considered reviewed on day D
                        const dayEndMs = dayMs + 86399999
                        if (lastReviewedMs > dayEndMs) return null

                        const S = Math.max((state.stability || 1), 1)
                        // t = days elapsed since last review, measured from last review
                        // moment to the end of the current day bucket
                        const t = (dayEndMs - lastReviewedMs) / 86400000
                        return Math.exp(-t / S) * 100
                    })
                    .filter(v => v !== null)

                if (perCard.length === 0) return null
                return Math.round(mean(perCard) * 10) / 10
            })

            series[topic] = retentionValues
        }

        // Log the computed series for debugging
        console.log('Retention series:', series)

        return { days, dayOffsets, labels, series }
    }

    // ---------------------------------------------------------------------------
    // CHART RENDERING
    // ---------------------------------------------------------------------------

    /**
     * Renders (or re-renders) the retention line chart on the given canvas.
     *
     * @param {string}      canvasId       - id of the <canvas> element
     * @param {Object}      retentionData  - result of computeRetentionSeries()
     * @param {string|null} filterTopic    - topic to isolate, or null for all topics
     */
    function renderRetentionChart(canvasId, retentionData, filterTopic) {
        const canvas = document.getElementById(canvasId)
        if (!canvas) return

        if (window[CHART_INSTANCE_KEY]) {
            window[CHART_INSTANCE_KEY].destroy()
            window[CHART_INSTANCE_KEY] = null
        }

        const { labels, series, dayOffsets } = retentionData
        const todayIndex = dayOffsets.indexOf(0)

        const topicsToShow = filterTopic ? [filterTopic] : Object.keys(series)

        const datasets = topicsToShow
            .filter(t => series[t])
            .map((topic, idx) => ({
                label: topic,
                data: series[topic].map(v => v === null ? NaN : v),
                borderColor: PALETTE[idx % PALETTE.length],
                backgroundColor: PALETTE[idx % PALETTE.length] + '22',
                borderWidth: 2,
                pointRadius: 2,
                tension: 0.35,
                spanGaps: true,
                fill: false,
            }))

        window[CHART_INSTANCE_KEY] = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { font: { size: 11 }, boxWidth: 12, padding: 10 },
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx =>
                                `${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + '%' : '—'}`,
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: { font: { size: 10 }, maxRotation: 45 },
                        grid: { color: 'rgba(0,0,0,0.04)' },
                    },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            font: { size: 10 },
                            callback: v => v + '%',
                        },
                        grid: { color: 'rgba(0,0,0,0.06)' },
                    },
                },
            },
            plugins: [
                {
                    id: 'recallTodayLine',
                    afterDraw(chart) {
                        if (todayIndex < 0) return
                        const ctx = chart.ctx
                        const xPos = chart.scales.x.getPixelForIndex(todayIndex)
                        const top = chart.scales.y.top
                        const bottom = chart.scales.y.bottom
                        ctx.save()
                        ctx.beginPath()
                        ctx.moveTo(xPos, top)
                        ctx.lineTo(xPos, bottom)
                        ctx.strokeStyle = 'rgba(100,100,200,0.45)'
                        ctx.lineWidth = 1.5
                        ctx.setLineDash([4, 3])
                        ctx.stroke()
                        ctx.font = '10px Segoe UI, sans-serif'
                        ctx.fillStyle = 'rgba(100,100,200,0.7)'
                        ctx.textAlign = 'center'
                        ctx.fillText('Today', xPos, top - 4)
                        ctx.restore()
                    },
                },
            ],
        })
    }

    // ---------------------------------------------------------------------------
    // EXPORTS
    // ---------------------------------------------------------------------------

    window.RecallDashboardRetention = {
        getTopics,
        resolveExamDate,
        computeRetentionSeries,
        renderRetentionChart,
    }
})()
