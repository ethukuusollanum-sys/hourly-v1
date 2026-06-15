import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// AI Summary — proxies to Anthropic so API key stays server-side
router.post('/ai/summary', async (req, res) => {
  try {
    const { activities } = req.body
    if (!activities) {
      return res.status(400).json({ error: 'Missing activities text' })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY not configured on server',
        hint: 'Set ANTHROPIC_API_KEY in server/.env',
      })
    }

    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 450,
      system: 'You are a productivity coach. Be concise, warm, actionable. Max 4 sentences.',
      messages: [
        {
          role: 'user',
          content: `My week:\n\n${activities}\n\nProductivity summary + one actionable tip.`,
        },
      ],
    })

    const text = message.content?.[0]?.text || 'Unable to generate summary.'
    res.json({ summary: text })
  } catch (err) {
    console.error('AI summary error:', err)
    res.status(500).json({
      error: 'AI generation failed',
      detail: err.message,
    })
  }
})

export default router
