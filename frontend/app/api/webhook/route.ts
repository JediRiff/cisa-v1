// CAPRI Webhook Alert API Endpoint
// Sends alert payloads to configured webhooks (Slack, Teams, Discord, generic)

import { NextRequest, NextResponse } from 'next/server'

interface WebhookPayload {
  alertType: 'critical_threat' | 'kev_added' | 'score_change' | 'nation_state' | 'test'
  title: string
  description: string
  details?: Record<string, string | number | boolean>
  dashboardUrl: string
  timestamp: string
}

interface RequestBody {
  webhookUrl: string
  payload: WebhookPayload
}

// Alert type configuration for styling
const ALERT_TYPE_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  critical_threat: { emoji: ':rotating_light:', color: '#DC2626', label: 'Critical Threat' },
  kev_added: { emoji: ':warning:', color: '#D97706', label: 'New KEV Entry' },
  score_change: { emoji: ':chart_with_downwards_trend:', color: '#B91C1C', label: 'Score Alert' },
  nation_state: { emoji: ':globe_with_meridians:', color: '#7C3AED', label: 'Nation-State Activity' },
  test: { emoji: ':white_check_mark:', color: '#059669', label: 'Test Message' },
}

// Build Slack-compatible webhook payload
function buildSlackPayload(payload: WebhookPayload): object {
  const config = ALERT_TYPE_CONFIG[payload.alertType] || ALERT_TYPE_CONFIG.test

  // Build fields from details
  const fields: { type: string; text: string }[] = []
  if (payload.details) {
    Object.entries(payload.details).forEach(([key, value]) => {
      // Format the key nicely
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
      fields.push({
        type: 'mrkdwn',
        text: `*${formattedKey}:*\n${value}`,
      })
    })
  }

  return {
    text: `${config.emoji} CAPRI Alert: ${payload.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${config.emoji} CAPRI Alert: ${config.label}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${payload.title}*`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.description,
        },
      },
      ...(fields.length > 0
        ? [
            {
              type: 'section',
              fields: fields.slice(0, 10), // Slack limits to 10 fields
            },
          ]
        : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:clock1: ${new Date(payload.timestamp).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
            })}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
              emoji: true,
            },
            url: payload.dashboardUrl,
            style: 'primary',
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
    attachments: [
      {
        color: config.color,
        fallback: `${payload.title} - ${payload.description}`,
      },
    ],
  }
}

// Build generic webhook payload (for non-Slack webhooks)
function buildGenericPayload(payload: WebhookPayload): object {
  const config = ALERT_TYPE_CONFIG[payload.alertType] || ALERT_TYPE_CONFIG.test

  return {
    source: 'CAPRI',
    alertType: payload.alertType,
    alertLabel: config.label,
    title: payload.title,
    description: payload.description,
    details: payload.details || {},
    dashboardUrl: payload.dashboardUrl,
    timestamp: payload.timestamp,
    severity: payload.alertType === 'test' ? 'info' : 'high',
  }
}

// Detect if URL is a Slack webhook
function isSlackWebhook(url: string): boolean {
  return url.includes('hooks.slack.com')
}

// Detect if URL is a Discord webhook
function isDiscordWebhook(url: string): boolean {
  return url.includes('discord.com/api/webhooks') || url.includes('discordapp.com/api/webhooks')
}

// Build Discord webhook payload
function buildDiscordPayload(payload: WebhookPayload): object {
  const config = ALERT_TYPE_CONFIG[payload.alertType] || ALERT_TYPE_CONFIG.test

  // Convert hex color to decimal for Discord
  const colorDecimal = parseInt(config.color.replace('#', ''), 16)

  const fields = payload.details
    ? Object.entries(payload.details).map(([key, value]) => ({
        name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim(),
        value: String(value),
        inline: true,
      }))
    : []

  return {
    content: `**CAPRI Alert: ${config.label}**`,
    embeds: [
      {
        title: payload.title,
        description: payload.description,
        color: colorDecimal,
        fields: fields.slice(0, 25), // Discord limits to 25 fields
        timestamp: payload.timestamp,
        footer: {
          text: 'CAPRI - Cyber Alert Prioritization & Readiness Index',
        },
        url: payload.dashboardUrl,
      },
    ],
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    const { webhookUrl, payload } = body

    // Validate inputs
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid webhook URL' },
        { status: 400 }
      )
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid payload' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(webhookUrl)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook URL format' },
        { status: 400 }
      )
    }

    // Build appropriate payload based on webhook type
    let webhookPayload: object

    if (isSlackWebhook(webhookUrl)) {
      webhookPayload = buildSlackPayload(payload)
    } else if (isDiscordWebhook(webhookUrl)) {
      webhookPayload = buildDiscordPayload(payload)
    } else {
      // Generic webhook - send JSON payload
      webhookPayload = buildGenericPayload(payload)
    }

    // Send webhook request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    })

    // Check response
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`Webhook delivery failed: ${response.status} - ${errorText}`)
      return NextResponse.json(
        {
          success: false,
          error: `Webhook returned status ${response.status}`,
          details: errorText.slice(0, 200),
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook delivered successfully',
    })
  } catch (error) {
    console.error('Webhook API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhook',
    description: 'CAPRI webhook notification endpoint',
    supportedTypes: ['slack', 'discord', 'generic'],
  })
}
