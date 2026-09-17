# kirimi-mcp

MCP server for the [Kirimi](https://kirimi.id) WhatsApp API. Exposes Kirimi as tools so AI agents can send WhatsApp messages, OTP, broadcasts and official WABA templates.

Works with any MCP client: Claude Desktop, Claude Code, Cursor, and others.

## Setup

Kirimi authenticates with a **`user_code` + `secret` pair sent in the request body**. There is no API key and no bearer token. Get both from the **Credentials** page in the Kirimi dashboard, and your device ID from the device list.

## Install

### Claude Code

```bash
claude mcp add kirimi npx -y kirimi-mcp \
  -e KIRIMI_USER_CODE=YOUR_USER_CODE \
  -e KIRIMI_SECRET=YOUR_SECRET \
  -e KIRIMI_DEVICE_ID=D-XXXXX
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kirimi": {
      "command": "npx",
      "args": ["-y", "kirimi-mcp"],
      "env": {
        "KIRIMI_USER_CODE": "YOUR_USER_CODE",
        "KIRIMI_SECRET": "YOUR_SECRET",
        "KIRIMI_DEVICE_ID": "D-XXXXX"
      }
    }
  }
}
```

### From source

```bash
git clone https://github.com/kiriminow/kirimi-mcp
cd kirimi-mcp
npm install
npm run build
```

Then point your client at `node /path/to/kirimi-mcp/dist/index.js`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KIRIMI_USER_CODE` | yes | User code from the Credentials page |
| `KIRIMI_SECRET` | yes | Secret from the Credentials page |
| `KIRIMI_DEVICE_ID` | no | Default device for device-scoped tools. Required if you do not pass `device_id` per call. |
| `KIRIMI_API_BASE_URL` | no | Override the API base URL (default `https://api.kirimi.id`) |
| `KIRIMI_TIMEOUT_MS` | no | Request timeout, default `30000` |

## Tools

### Messaging (QR device)

| Tool | Purpose |
|------|---------|
| `send_message` | Send text or media to one recipient. The normal way to reply. |
| `send_message_fast` | Same without the typing indicator. Use for time-sensitive messages. |
| `broadcast_message` | Send to up to 1000 recipients. Server enforces a minimum 30s gap. |

### OTP

| Tool | Purpose |
|------|---------|
| `send_otp` | Send an OTP. `method`: `whatsapp` (official provider, Rp 595/delivered), `device` (own device, free), `waba_user` (own WABA template, free). |
| `verify_otp` | Check the code the customer entered. |

### Devices

| Tool | Purpose |
|------|---------|
| `list_devices` | All devices with connection status. |
| `device_status` | Live status of one device. Check before broadcasting. |
| `device_status_enhanced` | Status plus message statistics. |
| `create_device` | Buy a new device with a package. |
| `connect_device` | Start pairing, returns the QR/session state. |
| `renew_device` | Renew a device subscription. |

### Contacts

| Tool | Purpose |
|------|---------|
| `save_contact` | Save one contact. Existing numbers are skipped. |
| `save_contacts_bulk` | Import up to 1000 contacts. |

### Account

| Tool | Purpose |
|------|---------|
| `get_user_info` | Name, balance, AI quota, device counts, message stats. |
| `list_packages` | Packages you can buy, with prices. |

### WABA (official WhatsApp Business API)

| Tool | Purpose |
|------|---------|
| `send_waba_template` | Send a Meta-approved template. Required to start a conversation. |
| `waba_list_conversations` | Numbers still inside the 24h customer service window. |
| `waba_reply` | Free-form reply. Only works inside that 24h window. |
| `waba_sync_templates` | Refresh template approval status from Meta. |

## Rules of thumb

- Phone numbers use the country code, no `+`, no leading zero: `6281234567890`.
- **Two send paths, not interchangeable.** The QR device sends free-form text any time and is the only path that can reach WhatsApp groups. The official WABA path requires an approved template to start a conversation, cannot reach groups, and is addressed by `waba_id` rather than `device_id`.
- Free text on WABA only works within 24 hours of the customer's last message. Call `waba_list_conversations` first.
- Before a broadcast, call `device_status` and confirm the device is connected. Leave at least 30 seconds between messages.
- A successful WABA response means Meta **accepted** the message, not that it was delivered. Final status arrives via webhook.
- Always use `send_otp` for OTP, never `send_message`.

## Development

```bash
npm install
npm run build
npm test        # builds, then runs the test suite
bun run dev     # run from source without building
```

## License

MIT
