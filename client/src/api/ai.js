export async function generateAISummary(activitiesText) {
  const res = await fetch('/api/ai/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activities: activitiesText }),
  })
  if (!res.ok) throw new Error('AI generation failed')
  const data = await res.json()
  return data.summary
}
