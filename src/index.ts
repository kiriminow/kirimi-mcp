#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { tools } from './tools/index.js'
import { handleTool } from './handlers.js'

const INSTRUCTIONS = `Kirimi is a WhatsApp gateway. Two sending paths exist and they are not interchangeable:

1. QR-scan device (send_message, send_message_fast, broadcast_message). Free-form messages any time, and the only path that can reach WhatsApp groups.
2. Official WhatsApp Business API, called WABA (send_waba_template, waba_reply). Business-initiated messages must use a Meta-approved template. Free text is only allowed inside the 24 hour window after the customer's last message — check waba_list_conversations first.

Rules that prevent failed sends:
- Phone numbers use the country code with no plus sign and no leading zero, e.g. 6281234567890.
- WABA is addressed by waba_id, never by device_id. WABA cannot send to groups.
- Before a broadcast, call device_status and confirm the device is connected. Leave at least 30 seconds between messages.
- A successful WABA response only means Meta accepted the message, not that it was delivered.
- never send an OTP through send_message. Use send_otp instead.`

const server = new Server(
  { name: 'kirimi-mcp', version: '1.1.0' },
  { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  return handleTool(name, args ?? {})
})

const transport = new StdioServerTransport()
await server.connect(transport)
