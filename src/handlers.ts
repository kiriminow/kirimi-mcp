import {
  apiCall,
  errorResult,
  requireCredentials,
  resolveDeviceId,
  textResult,
} from './client.js'

type Args = Record<string, unknown>

/** Read a required string argument, or throw a message the model can act on. */
function reqString(args: Args, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`"${key}" is required.`)
  }
  return value.trim()
}

/** Read an optional string argument, returning undefined when absent/empty. */
function optString(args: Args, key: string): string | undefined {
  const value = args[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optNumber(args: Args, key: string): number | undefined {
  const value = args[key]
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  if (Number.isNaN(n)) throw new Error(`"${key}" must be a number.`)
  return n
}

function reqStringArray(args: Args, key: string): string[] {
  const value = args[key]
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`"${key}" must be a non-empty array of strings.`)
  }
  return value.map((v) => String(v))
}

function reqObject(args: Args, key: string): Record<string, unknown> {
  const value = args[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`"${key}" must be an object.`)
  }
  return value as Record<string, unknown>
}

function reqNumber(args: Args, key: string): number {
  const value = optNumber(args, key)
  if (value === undefined) throw new Error(`"${key}" is required.`)
  return value
}

function reqObjectArray(args: Args, key: string): Record<string, unknown>[] {
  const value = args[key]
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`"${key}" must be a non-empty array.`)
  }
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`"${key}[${index}]" must be an object.`)
    }
    return item as Record<string, unknown>
  })
}

/** A message can be text, media, or both — but not neither. */
function requireMessageOrMedia(message?: string, mediaUrl?: string): void {
  if (!message && !mediaUrl) {
    throw new Error('"message" or "media_url" is required.')
  }
}

export async function handleTool(
  name: string,
  args: Args,
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  try {
    // Only the account-level tools skip credentials; every API call needs them.
    const credentials = requireCredentials()

    switch (name) {
      // ─── Messaging ──────────────────────────────────────────────────────
      case 'send_message': {
        const receiver = reqString(args, 'receiver')
        const message = optString(args, 'message')
        const mediaUrl = optString(args, 'media_url')
        requireMessageOrMedia(message, mediaUrl)

        return textResult(
          await apiCall(
            '/v1/send-message',
            {
              device_id: resolveDeviceId(args.device_id),
              receiver,
              message,
              media_url: mediaUrl,
              fileName: optString(args, 'file_name'),
              quotedMessageId: optString(args, 'quoted_message_id'),
            },
            credentials,
          ),
        )
      }

      case 'send_message_fast': {
        const receiver = reqString(args, 'receiver')
        const message = optString(args, 'message')
        const mediaUrl = optString(args, 'media_url')
        requireMessageOrMedia(message, mediaUrl)

        return textResult(
          await apiCall(
            '/v1/send-message-fast',
            {
              device_id: resolveDeviceId(args.device_id),
              receiver,
              message,
              media_url: mediaUrl,
            },
            credentials,
          ),
        )
      }

      case 'broadcast_message': {
        const label = reqString(args, 'label')
        const numbers = reqStringArray(args, 'numbers')
        const message = optString(args, 'message')
        const mediaUrl = optString(args, 'media_url')
        requireMessageOrMedia(message, mediaUrl)

        return textResult(
          await apiCall(
            '/v1/broadcast-message',
            {
              device_id: resolveDeviceId(args.device_id),
              label,
              numbers,
              message,
              media_url: mediaUrl,
              delay: optNumber(args, 'delay'),
              delayMin: optNumber(args, 'delay_min'),
              delayMax: optNumber(args, 'delay_max'),
            },
            credentials,
          ),
        )
      }

      // ─── OTP ────────────────────────────────────────────────────────────
      case 'send_otp': {
        const method = (optString(args, 'method') ?? 'whatsapp') as
          | 'whatsapp'
          | 'device'
          | 'waba_user'
        if (!['whatsapp', 'device', 'waba_user'].includes(method)) {
          throw new Error('"method" must be one of: whatsapp, device, waba_user.')
        }

        // Only pass the fields the chosen method actually uses, so the API
        // does not reject a request that carries irrelevant keys.
        const deviceId =
          method === 'device'
            ? resolveDeviceId(args.device_id)
            : optString(args, 'device_id')

        return textResult(
          await apiCall(
            '/v2/otp/send',
            {
              phone: reqString(args, 'phone'),
              method,
              app_name: optString(args, 'app_name'),
              device_id: deviceId,
              waba_id: method === 'waba_user' ? reqString(args, 'waba_id') : undefined,
              template_name:
                method === 'waba_user' ? reqString(args, 'template_name') : undefined,
              custom_message: optString(args, 'custom_message'),
            },
            credentials,
          ),
        )
      }

      case 'verify_otp':
        return textResult(
          await apiCall(
            '/v2/otp/verify',
            {
              phone: reqString(args, 'phone'),
              otp_code: reqString(args, 'otp_code'),
            },
            credentials,
          ),
        )

      // ─── Devices ────────────────────────────────────────────────────────
      case 'list_devices':
        return textResult(
          await apiCall(
            '/v1/list-devices',
            { page: optNumber(args, 'page'), limit: optNumber(args, 'limit') },
            credentials,
          ),
        )

      case 'device_status':
        return textResult(
          await apiCall(
            '/v1/device-status',
            { device_id: resolveDeviceId(args.device_id) },
            credentials,
          ),
        )

      case 'device_status_enhanced':
        return textResult(
          await apiCall(
            '/v1/device-status-enhanced',
            { device_id: resolveDeviceId(args.device_id) },
            credentials,
          ),
        )

      case 'create_device':
        return textResult(
          await apiCall(
            '/v1/create-device',
            {
              package_id: reqNumber(args, 'package_id'),
              voucher_code: optString(args, 'voucher_code'),
            },
            credentials,
          ),
        )

      case 'connect_device':
        return textResult(
          await apiCall(
            '/v1/connect-device',
            { device_id: reqString(args, 'device_id') },
            credentials,
          ),
        )

      case 'renew_device':
        return textResult(
          await apiCall(
            '/v1/renew-device',
            {
              device_id: reqString(args, 'device_id'),
              package_id: reqNumber(args, 'package_id'),
              voucher_code: optString(args, 'voucher_code'),
            },
            credentials,
          ),
        )

      // ─── Contacts ───────────────────────────────────────────────────────
      case 'save_contact':
        return textResult(
          await apiCall(
            '/v1/save-contact',
            {
              nama: reqString(args, 'nama'),
              nomor: reqString(args, 'nomor'),
              device_id: optString(args, 'device_id'),
            },
            credentials,
          ),
        )

      case 'save_contacts_bulk':
        return textResult(
          await apiCall(
            '/v1/save-contacts-bulk',
            {
              contacts: reqObjectArray(args, 'contacts'),
              device_id: optString(args, 'device_id'),
            },
            credentials,
          ),
        )

      // ─── Account ────────────────────────────────────────────────────────
      case 'get_user_info':
        return textResult(await apiCall('/v1/user-info', {}, credentials))

      case 'list_packages':
        return textResult(await apiCall('/v1/list-packages', {}, credentials))

      // ─── WABA ───────────────────────────────────────────────────────────
      case 'send_waba_template':
        return textResult(
          await apiCall(
            '/v1/waba/send-message',
            {
              waba_id: reqString(args, 'waba_id'),
              to: reqString(args, 'to'),
              template_name: reqString(args, 'template_name'),
              variables: args.variables === undefined
                ? undefined
                : reqStringArray(args, 'variables'),
              header: args.header === undefined ? undefined : reqObject(args, 'header'),
            },
            credentials,
          ),
        )

      case 'waba_list_conversations':
        return textResult(
          await apiCall(
            '/v1/waba/conversations',
            { limit: optNumber(args, 'limit'), page: optNumber(args, 'page') },
            credentials,
          ),
        )

      case 'waba_reply':
        return textResult(
          await apiCall(
            '/v1/waba/messages/reply',
            {
              waba_id: reqString(args, 'waba_id'),
              to: reqString(args, 'to'),
              message: reqObject(args, 'message'),
            },
            credentials,
          ),
        )

      case 'waba_sync_templates':
        return textResult(
          await apiCall(
            '/v1/waba/templates/sync',
            { waba_id: reqString(args, 'waba_id') },
            credentials,
          ),
        )

      default:
        return errorResult(`Unknown tool: ${name}`)
    }
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err))
  }
}
