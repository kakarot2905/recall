'use client'

interface Props {
    sources: any[]
    cards: any[]
    user: any
}

function countCardTypes(cards: any[]) {
    const counts = { mcq: 0, short_answer: 0, fill_blank: 0, fact: 0 } as Record<string, number>
    for (const card of cards) {
        if (counts[card?.type] !== undefined) counts[card.type]++
    }
    return counts
}

export default function BackendSnapshot({ sources, cards, user }: Props) {
    const totalCounts = countCardTypes(cards)
    const cardsBySource: Record<string, any[]> = {}
    for (const card of cards) {
        const sid = String(card?.sourceId || '')
        if (!cardsBySource[sid]) cardsBySource[sid] = []
        cardsBySource[sid].push(card)
    }

    const sectionStyle = { border: '1px solid #d8deea', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }
    const titleStyle = { background: '#f0f3fc', padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#5e6678', textTransform: 'uppercase' as const, letterSpacing: '0.6px', borderBottom: '1px solid #d8deea' }
    const rowStyle = { display: 'flex', gap: 8, padding: '5px 12px', fontSize: 13, borderBottom: '1px solid #f0f2f8', alignItems: 'center' }
    const keyStyle = { color: '#5e6678', fontSize: 12, minWidth: 140, flexShrink: 0 }

    return (
        <div>
            <div style={sectionStyle}>
                <div style={titleStyle}>Account</div>
                <div style={{ padding: '4px 0' }}>
                    <div style={rowStyle}><span style={keyStyle}>User</span><span>{user?.name} ({user?.email})</span></div>
                    <div style={rowStyle}><span style={keyStyle}>Total Sources</span><span>{sources.length}</span></div>
                    <div style={rowStyle}>
                        <span style={keyStyle}>Total Cards</span>
                        <span>{cards.length} — mcq: {totalCounts.mcq}, short_answer: {totalCounts.short_answer}, fill_blank: {totalCounts.fill_blank}, fact: {totalCounts.fact}</span>
                    </div>
                </div>
            </div>

            {sources.map(source => {
                const sourceCards = cardsBySource[String(source._id)] || []
                const counts = countCardTypes(sourceCards)
                return (
                    <div key={source._id} style={sectionStyle}>
                        <div style={titleStyle}>
                            {source.topic} — <span style={{ fontWeight: 400 }}>{source.status}</span> — {sourceCards.length} card(s)
                        </div>
                        <div style={{ padding: '4px 0' }}>
                            <div style={rowStyle}><span style={keyStyle}>Exam Date</span><span>{source.examDate ? new Date(source.examDate).toLocaleDateString() : '—'}</span></div>
                            <div style={rowStyle}><span style={keyStyle}>Notes Preview</span><span style={{ fontSize: 12, color: '#5e6678' }}>{source.notes?.slice(0, 80)}</span></div>
                            <div style={rowStyle}>
                                <span style={keyStyle}>Card Types</span>
                                <span style={{ fontSize: 12, color: '#5e6678' }}>mcq: {counts.mcq}, short_answer: {counts.short_answer}, fill_blank: {counts.fill_blank}, fact: {counts.fact}</span>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}