'use client'

import { useState } from 'react'

interface Props {
    cards: any[]
    sources: any[]
    selectedSourceId: string
    onRefresh: () => void
    api: (path: string, options?: RequestInit) => Promise<any>
}

export default function CardsPanel({ cards, sources, selectedSourceId, onRefresh, api }: Props) {
    const [error, setError] = useState('')

    const selectedCards = cards.filter(c => String(c.sourceId) === String(selectedSourceId))

    async function handleDelete(cardId: string) {
        if (!confirm('Delete this card?')) return
        try {
            await api(`/api/cards/${cardId}`, { method: 'DELETE' })
            onRefresh()
        } catch (err: any) {
            setError(err.message || 'Failed to delete card')
        }
    }

    return (
        <div style={{ background: '#fff', border: '1px solid #d8deea', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Cards</h2>
                <span style={{ color: '#5e6678', fontSize: 13 }}>
                    {selectedSourceId ? `${selectedCards.length} card(s)` : 'Pick a source'}
                </span>
            </div>

            {error && <p style={{ color: '#b42318', fontSize: 12 }}>{error}</p>}

            {!selectedSourceId && (
                <p style={{ color: '#5e6678', fontSize: 13 }}>Select a source from the left panel.</p>
            )}

            <div style={{ display: 'grid', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
                {selectedCards.map(card => (
                    <div key={card._id} style={{ border: '1px solid #d8deea', borderRadius: 10, padding: 10, background: '#fcfdff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <span style={{ border: '1px solid #cfd6ea', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: '#3f4860' }}>{card.type}</span>
                                <span style={{ border: '1px solid #cfd6ea', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: '#3f4860' }}>Difficulty {card.difficulty}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(card._id)}
                                style={{ border: '1px solid #f1b7b5', color: '#8f1f1b', background: '#fff5f4', borderRadius: 8, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                            >
                                Delete
                            </button>
                        </div>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13 }}>
                            {card.question || card.content || '—'}
                        </p>
                        {Array.isArray(card.options) && card.options.length > 0 && (
                            <p style={{ margin: '0 0 2px', color: '#5e6678', fontSize: 12 }}>Options: {card.options.join(' | ')}</p>
                        )}
                        {(card.correct || card.answer) && (
                            <p style={{ margin: '0 0 2px', color: '#5e6678', fontSize: 12 }}>Answer: {card.correct || card.answer}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}