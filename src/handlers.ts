import { apiCall, errorResult, requireEnv, textResult } from './client.js'

export async function handleTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  try {
    const { apiKey, deviceId } = requireEnv()

    switch (name) {
      case 'send_message': {
        const { receiver, message, media_url, quoted_message_id } = args as {
          receiver: string
          message?: string
          media_url?: string
          quoted_message_id?: string
        }
        const data = await apiCall(
          '/v1/send-message',
          {
            receiver,
            ...(message ? { message } : {}),
            ...(media_url ? { media_url } : {}),
            ...(quoted_message_id ? { quotedMessageId: quoted_message_id } : {}),
          },
          apiKey,
          deviceId,
        )
        return textResult(data)
      }

      case 'broadcast_message': {
        const { label, numbers, message, media_url, delay, delay_min, delay_max } = args as {
          label: string
          numbers: string[]
          message?: string
          media_url?: string
          delay?: number
          delay_min?: number
          delay_max?: number
        }
        const data = await apiCall(
          '/v1/broadcast-message',
          {
            label,
            numbers,
            ...(message ? { message } : {}),
            ...(media_url ? { media_url } : {}),
            ...(delay ? { delay } : {}),
            ...(delay_min ? { delayMin: delay_min } : {}),
            ...(delay_max ? { delayMax: delay_max } : {}),
          },
          apiKey,
          deviceId,
        )
        return textResult(data)
      }

      case 'list_devices': {
        const data = await apiCall('/v1/list-devices', {}, apiKey)
        return textResult(data)
      }

      case 'device_status': {
        const { device_id } = args as { device_id?: string }
        const targetDevice = (device_id ?? deviceId) as string
        const data = await apiCall('/v1/device-status', {}, apiKey, targetDevice)
        return textResult(data)
      }

      case 'save_contact': {
        const { nama, nomor, device_id } = args as {
          nama: string
          nomor: string
          device_id?: string
        }
        const data = await apiCall(
          '/v1/save-contact',
          { nama, nomor, ...(device_id ? { device_id } : {}) },
          apiKey,
        )
        return textResult(data)
      }

      case 'save_contacts_bulk': {
        const { contacts, device_id } = args as {
          contacts: { nama: string; nomor: string }[]
          device_id?: string
        }
        const data = await apiCall(
          '/v1/save-contacts-bulk',
          { contacts, ...(device_id ? { device_id } : {}) },
          apiKey,
        )
        return textResult(data)
      }

      case 'get_user_info': {
        const data = await apiCall('/v1/user-info', {}, apiKey)
        return textResult(data)
      }

      default:
        return errorResult(`Unknown tool: ${name}`)
    }
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err))
  }
}
