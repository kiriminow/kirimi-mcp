import type { Tool } from '@modelcontextprotocol/sdk/types.js'

const deviceIdProperty = {
  type: 'string',
  description:
    'Device ID (e.g. D-XXXXX). Optional if the KIRIMI_DEVICE_ID environment variable is set.',
}

const phoneDescription = 'Phone number in international format without + (e.g. 6281234567890)'

export const tools: Tool[] = [
  // ─── Messaging (QR device) ────────────────────────────────────────────────
  {
    name: 'send_message',
    description:
      'Send a WhatsApp text or media message to one recipient through a QR-scan device. This is the normal way to reply to a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        receiver: { type: 'string', description: `${phoneDescription}, or a group JID` },
        message: { type: 'string', description: 'Message text. Becomes the caption when media_url is set. Required unless media_url is given.' },
        media_url: {
          type: 'string',
          description: 'Public URL of an image, video, audio or document to attach. Max 50 MB. Required unless message is given.',
        },
        quoted_message_id: {
          type: 'string',
          description: 'Message ID to quote in the reply',
        },
        device_id: deviceIdProperty,
      },
      required: ['receiver'],
    },
  },
  {
    name: 'send_message_fast',
    description:
      'Same as send_message but skips the typing indicator. Use for time-sensitive messages such as OTP.',
    inputSchema: {
      type: 'object',
      properties: {
        receiver: { type: 'string', description: phoneDescription },
        message: { type: 'string', description: 'Message text. Required unless media_url is given.' },
        media_url: { type: 'string', description: 'Public URL of media to attach' },
        device_id: deviceIdProperty,
      },
      required: ['receiver'],
    },
  },
  {
    name: 'broadcast_message',
    description:
      'Send the same message to many recipients. Max 1000 numbers per call. The server enforces a minimum 30 second delay between sends, so this returns immediately while delivery continues in the background.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Name for this broadcast, for your own tracking (max 100 chars)' },
        numbers: {
          type: 'array',
          items: { type: 'string' },
          description: `Recipient numbers. ${phoneDescription}`,
        },
        message: { type: 'string', description: 'Message text to broadcast. Required unless media_url is given.' },
        media_url: { type: 'string', description: 'Public URL of media to attach to every message' },
        delay: {
          type: 'number',
          description: 'Seconds between messages. Server clamps to 30-3600. Default 30.',
        },
        delay_min: { type: 'number', description: 'Lower bound when using a random delay range' },
        delay_max: { type: 'number', description: 'Upper bound when using a random delay range' },
        device_id: deviceIdProperty,
      },
      required: ['label', 'numbers'],
    },
  },

  // ─── OTP ──────────────────────────────────────────────────────────────────
  {
    name: 'send_otp',
    description:
      'Send a one-time password. Pick the method deliberately: "whatsapp" uses the official Kirimi provider and costs Rp 595 per delivered OTP with no setup; "device" sends through your own connected device and is free; "waba_user" sends through your own WhatsApp Business API template and is free.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: `${phoneDescription} — the OTP recipient` },
        method: {
          type: 'string',
          enum: ['whatsapp', 'device', 'waba_user'],
          description:
            'Delivery channel. Default "whatsapp". Requires device_id when "device", and waba_id + template_name when "waba_user".',
        },
        app_name: {
          type: 'string',
          description: 'Brand name shown in the message. Default "Kirimi.id".',
        },
        device_id: { type: 'string', description: 'Required when method is "device"' },
        waba_id: { type: 'string', description: 'Required when method is "waba_user"' },
        template_name: {
          type: 'string',
          description:
            'Required when method is "waba_user". Must be an APPROVED AUTHENTICATION category template.',
        },
        custom_message: {
          type: 'string',
          description:
            'Only for method "device". Must contain the {{otp}} placeholder and be 10-500 characters.',
        },
      },
      required: ['phone'],
    },
  },
  {
    name: 'verify_otp',
    description: 'Check an OTP code the customer received. Returns whether the code is valid.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: `${phoneDescription} — the number the OTP was sent to` },
        otp_code: { type: 'string', description: 'The 6 digit code the customer entered' },
      },
      required: ['phone', 'otp_code'],
    },
  },

  // ─── Devices ──────────────────────────────────────────────────────────────
  {
    name: 'list_devices',
    description: 'List every WhatsApp device on this account with its connection status.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number, default 1' },
        limit: { type: 'number', description: 'Devices per page, default 10' },
      },
    },
  },
  {
    name: 'device_status',
    description:
      'Get the live connection status of a device. Check this before a broadcast so you do not send to a disconnected device.',
    inputSchema: {
      type: 'object',
      properties: { device_id: deviceIdProperty },
    },
  },
  {
    name: 'device_status_enhanced',
    description: 'Get detailed device status, including today and total message statistics.',
    inputSchema: {
      type: 'object',
      properties: { device_id: deviceIdProperty },
    },
  },
  {
    name: 'create_device',
    description:
      'Create a new WhatsApp device. Costs the package price from your balance. Get package_id from list_packages.',
    inputSchema: {
      type: 'object',
      properties: {
        package_id: { type: 'number', description: 'Package to buy. See list_packages.' },
        voucher_code: { type: 'string', description: 'Optional voucher code for a discount' },
      },
      required: ['package_id'],
    },
  },
  {
    name: 'connect_device',
    description: 'Start connecting a device. Returns the QR/session state used to pair WhatsApp.',
    inputSchema: {
      type: 'object',
      properties: { device_id: { type: 'string', description: 'Device to connect' } },
      required: ['device_id'],
    },
  },
  {
    name: 'renew_device',
    description: 'Renew a device subscription by buying a package for it.',
    inputSchema: {
      type: 'object',
      properties: {
        device_id: { type: 'string', description: 'Device to renew' },
        package_id: { type: 'number', description: 'Renewal package. See list_packages.' },
        voucher_code: { type: 'string', description: 'Optional voucher code' },
      },
      required: ['device_id', 'package_id'],
    },
  },

  // ─── Contacts ─────────────────────────────────────────────────────────────
  {
    name: 'save_contact',
    description: 'Save one contact. Numbers that already exist are skipped, not overwritten.',
    inputSchema: {
      type: 'object',
      properties: {
        nama: { type: 'string', description: 'Contact name' },
        nomor: { type: 'string', description: `${phoneDescription}` },
        device_id: deviceIdProperty,
      },
      required: ['nama', 'nomor'],
    },
  },
  {
    name: 'save_contacts_bulk',
    description: 'Import up to 1000 contacts in one call. Existing numbers are skipped.',
    inputSchema: {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          description: 'Contacts to import',
          items: {
            type: 'object',
            properties: {
              nama: { type: 'string', description: 'Contact name' },
              nomor: { type: 'string', description: 'Phone number' },
            },
            required: ['nama', 'nomor'],
          },
        },
        device_id: deviceIdProperty,
      },
      required: ['contacts'],
    },
  },

  // ─── Account ──────────────────────────────────────────────────────────────
  {
    name: 'get_user_info',
    description: 'Get account details: name, balance (saldo), AI quota, device count and message statistics.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_packages',
    description: 'List the packages you can buy for a device, with prices.',
    inputSchema: { type: 'object', properties: {} },
  },

  // ─── WABA (official WhatsApp Business API) ────────────────────────────────
  {
    name: 'send_waba_template',
    description:
      'Send an approved WhatsApp template through the official WhatsApp Business API. Business-initiated conversations MUST use a template. Templates cannot be replaced with free text. WABA cannot send to groups and is addressed by waba_id, not device_id.',
    inputSchema: {
      type: 'object',
      properties: {
        waba_id: { type: 'string', description: 'WhatsApp Business Account ID (not the device ID)' },
        to: { type: 'string', description: `${phoneDescription}` },
        template_name: { type: 'string', description: 'Approved template name, e.g. hello_world' },
        variables: {
          type: 'array',
          items: { type: 'string' },
          description: 'Body variables in order, filling {{1}}, {{2}}, and so on',
        },
        header: {
          type: 'object',
          description:
            'Header component. Required when the template has a media or dynamic text header, e.g. {"type":"document","link":"https://.../file.pdf","filename":"file.pdf"}',
        },
      },
      required: ['waba_id', 'to', 'template_name'],
    },
  },
  {
    name: 'waba_list_conversations',
    description:
      'List the customers still inside the 24 hour customer service window. These are the numbers you may reply to with free text instead of a template.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Results per page, 1-200. Default 50.' },
        page: { type: 'number', description: 'Page number, default 1' },
      },
    },
  },
  {
    name: 'waba_reply',
    description:
      'Reply with free-form text or media through the official API. Only allowed within 24 hours of the customer\'s last message — use waba_list_conversations to check first. Outside that window the API rejects it and you must send a template instead.',
    inputSchema: {
      type: 'object',
      properties: {
        waba_id: { type: 'string', description: 'WhatsApp Business Account ID' },
        to: { type: 'string', description: 'The customer who messaged you first' },
        message: {
          type: 'object',
          description:
            'Message object: {"type":"text","text":"..."} or {"type":"image","media_url":"https://...","caption":"..."} or {"type":"interactive","interactive":{...}}',
        },
      },
      required: ['waba_id', 'to', 'message'],
    },
  },
  {
    name: 'waba_sync_templates',
    description:
      'Refresh template approval status from Meta for one WABA. Run this before sending a newly created template. Rate limited to 10 syncs per hour.',
    inputSchema: {
      type: 'object',
      properties: {
        waba_id: { type: 'string', description: 'WhatsApp Business Account ID to refresh' },
      },
      required: ['waba_id'],
    },
  },
]
