import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const tools: Tool[] = [
  {
    name: 'send_message',
    description:
      'Send a WhatsApp message to a single recipient. Supports text, media URL, and quoted replies.',
    inputSchema: {
      type: 'object',
      properties: {
        receiver: {
          type: 'string',
          description: 'Recipient phone number (e.g. 628123456789) or group JID',
        },
        message: { type: 'string', description: 'Text message to send' },
        media_url: {
          type: 'string',
          description: 'Optional public URL of image/video/document to attach',
        },
        quoted_message_id: {
          type: 'string',
          description: 'Optional message ID to quote/reply to',
        },
      },
      required: ['receiver'],
    },
  },
  {
    name: 'broadcast_message',
    description:
      'Send a WhatsApp message to multiple recipients at once. Max 1000 numbers per call. Delay between sends is enforced automatically (min 30s).',
    inputSchema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          description: 'Broadcast label/name (max 100 chars)',
        },
        numbers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of recipient phone numbers',
        },
        message: { type: 'string', description: 'Text message to broadcast' },
        media_url: {
          type: 'string',
          description: 'Optional media URL to attach to every message',
        },
        delay: {
          type: 'number',
          description: 'Fixed delay in seconds between sends (default 30, min 30)',
        },
        delay_min: {
          type: 'number',
          description: 'Minimum delay in seconds for random delay range',
        },
        delay_max: {
          type: 'number',
          description: 'Maximum delay in seconds for random delay range',
        },
      },
      required: ['label', 'numbers'],
    },
  },
  {
    name: 'list_devices',
    description: 'List all WhatsApp devices connected to this Kirimi account with their status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'device_status',
    description: 'Get detailed status of a specific WhatsApp device.',
    inputSchema: {
      type: 'object',
      properties: {
        device_id: {
          type: 'string',
          description: 'Device ID (e.g. D-XXXXX). Defaults to KIRIMI_DEVICE_ID env var if not provided.',
        },
      },
    },
  },
  {
    name: 'save_contact',
    description: 'Save a single contact to the Kirimi contact list.',
    inputSchema: {
      type: 'object',
      properties: {
        nama: { type: 'string', description: 'Contact name' },
        nomor: { type: 'string', description: 'Contact phone number' },
        device_id: {
          type: 'string',
          description: 'Optional device ID to associate this contact with',
        },
      },
      required: ['nama', 'nomor'],
    },
  },
  {
    name: 'save_contacts_bulk',
    description: 'Import multiple contacts at once (max 1000). Duplicates are skipped.',
    inputSchema: {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          description: 'Array of contact objects',
          items: {
            type: 'object',
            properties: {
              nama: { type: 'string' },
              nomor: { type: 'string' },
            },
            required: ['nama', 'nomor'],
          },
        },
        device_id: {
          type: 'string',
          description: 'Optional device ID to associate all contacts with',
        },
      },
      required: ['contacts'],
    },
  },
  {
    name: 'get_user_info',
    description:
      'Get current Kirimi account info: name, saldo, AI quota, device counts, and message stats.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]
