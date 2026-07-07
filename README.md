# kirimi-mcp

MCP server for [Kirimi](https://kirimi.id) WhatsApp API. Exposes Kirimi API tools to AI agents via the Model Context Protocol.

## Tools

| Tool | Description |
|------|-------------|
| `send_message` | Send a WhatsApp message to a single recipient |
| `broadcast_message` | Broadcast to multiple recipients (max 1000) |
| `list_devices` | List all connected WhatsApp devices |
| `device_status` | Get status of a specific device |
| `save_contact` | Save a single contact |
| `save_contacts_bulk` | Bulk import contacts (max 1000) |
| `get_user_info` | Get account info, saldo, and stats |

## Setup

1. Get an API key from [dash.kirimi.id/settings?tab=api](https://dash.kirimi.id/settings?tab=api)
2. Find your device ID in the Kirimi dashboard

### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kirimi": {
      "command": "npx",
      "args": ["-y", "kirimi-mcp"],
      "env": {
        "KIRIMI_API_KEY": "your_api_key_here",
        "KIRIMI_DEVICE_ID": "D-XXXXX"
      }
    }
  }
}
```

### With Claude Code

```bash
claude mcp add kirimi npx kirimi-mcp \
  -e KIRIMI_API_KEY=your_api_key_here \
  -e KIRIMI_DEVICE_ID=D-XXXXX
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KIRIMI_API_KEY` | ✅ | API key from Kirimi dashboard |
| `KIRIMI_DEVICE_ID` | ✅ | Default device ID for sending messages |
| `KIRIMI_API_BASE_URL` | ❌ | Override API base URL (default: `https://api.kirimi.id`) |

## Development

```bash
bun install
bun run dev
```

## License

MIT
