const DEFAULT_OFFSET_DAYS = 14
const MIN_OFFSET_DAYS = 1
const MAX_OFFSET_DAYS = 365

export const LM_STUDIO_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'available_hindsight_logs',
      description: 'Returns counts of available Hindsight worklog entries by day for a lookback window.',
      parameters: {
        type: 'object',
        properties: {
          offset: {
            type: 'integer',
            minimum: MIN_OFFSET_DAYS,
            maximum: MAX_OFFSET_DAYS,
            description: `Number of days to look back (default: ${DEFAULT_OFFSET_DAYS})`
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_hindsight_logs',
      description: 'Returns Hindsight worklog entries for a date range.',
      parameters: {
        type: 'object',
        properties: {
          start: {
            type: 'string',
            description: 'Start of the date range in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)'
          },
          end: {
            type: 'string',
            description: 'End of the date range in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)'
          }
        },
        required: ['start', 'end']
      }
    }
  }
]

function clampOffset(offset) {
  const parsed = Number.parseInt(String(offset ?? DEFAULT_OFFSET_DAYS), 10)
  if (Number.isNaN(parsed)) {
    return DEFAULT_OFFSET_DAYS
  }
  return Math.min(MAX_OFFSET_DAYS, Math.max(MIN_OFFSET_DAYS, parsed))
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

async function fetchJson(url) {
  const response = await fetch(url)
  const body = await response.text()

  if (!response.ok) {
    const suffix = body ? `: ${body}` : ''
    throw new Error(`HTTP ${response.status}${suffix}`)
  }

  if (!body) return null
  return JSON.parse(body)
}

function toLocalDayRange(startIsoString, endIsoString) {
  const startDate = new Date(startIsoString)
  const endDate = new Date(endIsoString)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid start/end date format. Expected ISO 8601 UTC strings.')
  }

  const localStart = new Date(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
    0, 0, 0, 0
  )

  const localEnd = new Date(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
    23, 59, 59, 999
  )

  return {
    start: Math.floor(localStart.getTime() / 1000),
    end: Math.floor(localEnd.getTime() / 1000)
  }
}

async function executeAvailableHindsightLogs(args, hindsightApiUrl) {
  const offset = clampOffset(args?.offset)
  try {
    const query = new URLSearchParams({ offset: String(offset) })
    const data = await fetchJson(`${hindsightApiUrl}/worklogs/counts?${query}`)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

async function executeGetHindsightLogs(args, hindsightApiUrl) {
  const start = args?.start
  const end = args?.end

  if (typeof start !== 'string' || typeof end !== 'string') {
    return {
      success: false,
      error: 'start and end must be provided as ISO 8601 UTC strings'
    }
  }

  try {
    const range = toLocalDayRange(start, end)
    const query = new URLSearchParams({
      start: String(range.start),
      end: String(range.end)
    })
    const data = await fetchJson(`${hindsightApiUrl}/worklogs?${query}`)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function executeHindsightTool(name, args, hindsightApiUrl) {
  if (name === 'available_hindsight_logs') {
    return executeAvailableHindsightLogs(args, hindsightApiUrl)
  }

  if (name === 'get_hindsight_logs') {
    return executeGetHindsightLogs(args, hindsightApiUrl)
  }

  return { success: false, error: `Unknown tool: ${name}` }
}
