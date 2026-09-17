import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  apiCall,
  KirimiApiError,
  requireCredentials,
  resolveDeviceId,
} from '../dist/client.js'
import { handleTool } from '../dist/handlers.js'

let calls = []
const originalFetch = globalThis.fetch

function mockFetch({ status = 200, body = { success: true, data: null, message: 'OK' } } = {}) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) })
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

beforeEach(() => {
  calls = []
  process.env.KIRIMI_USER_CODE = 'KM123'
  process.env.KIRIMI_SECRET = 'sec456'
  delete process.env.KIRIMI_DEVICE_ID
})

afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env.KIRIMI_USER_CODE
  delete process.env.KIRIMI_SECRET
  delete process.env.KIRIMI_DEVICE_ID
})

describe('apiCall', () => {
  test('authenticates with user_code and secret in the body', async () => {
    mockFetch()
    await apiCall('/v1/user-info', {}, requireCredentials())

    assert.equal(calls.length, 1)
    assert.equal(calls[0].body.user_code, 'KM123')
    assert.equal(calls[0].body.secret, 'sec456')
  })

  test('never sends an Authorization header', async () => {
    mockFetch()
    await apiCall('/v1/user-info', {}, requireCredentials())

    const headers = calls[0].init.headers
    assert.equal(headers.Authorization, undefined)
    assert.equal(headers.authorization, undefined)
  })

  test('drops undefined fields instead of sending null', async () => {
    mockFetch()
    await apiCall('/v1/send-message', { receiver: '6281', media_url: undefined }, requireCredentials())

    assert.ok('receiver' in calls[0].body)
    assert.equal('media_url' in calls[0].body, false)
  })

  test('returns the response envelope', async () => {
    mockFetch({ body: { success: true, data: { id: 7 }, message: 'ok' } })
    const res = await apiCall('/v1/user-info', {}, requireCredentials())

    assert.deepEqual(res, { success: true, data: { id: 7 }, message: 'ok' })
  })

  test('throws KirimiApiError carrying the API message on 401', async () => {
    mockFetch({ status: 401, body: { success: false, data: null, message: 'Invalid credentials' } })

    await assert.rejects(
      () => apiCall('/v1/user-info', {}, requireCredentials()),
      (err) => {
        assert.ok(err instanceof KirimiApiError)
        assert.equal(err.statusCode, 401)
        assert.equal(err.message, 'Invalid credentials')
        return true
      },
    )
  })

  test('throws when the API returns 200 with success:false', async () => {
    mockFetch({ status: 200, body: { success: false, data: null, message: 'Saldo tidak cukup' } })

    await assert.rejects(
      () => apiCall('/v2/otp/send', {}, requireCredentials()),
      (err) => {
        assert.ok(err instanceof KirimiApiError)
        assert.equal(err.message, 'Saldo tidak cukup')
        return true
      },
    )
  })
})

describe('credentials', () => {
  test('requireCredentials explains where to find the values', () => {
    delete process.env.KIRIMI_USER_CODE
    assert.throws(() => requireCredentials(), /KIRIMI_USER_CODE is not set[\s\S]*Credentials/u)
  })

  test('resolveDeviceId falls back to KIRIMI_DEVICE_ID', () => {
    process.env.KIRIMI_DEVICE_ID = 'D-ENV'
    assert.equal(resolveDeviceId(undefined), 'D-ENV')
    assert.equal(resolveDeviceId('D-ARG'), 'D-ARG')
  })

  test('resolveDeviceId throws a usable message when nothing is configured', () => {
    assert.throws(() => resolveDeviceId(undefined), /device_id is required/u)
  })
})

describe('handleTool', () => {
  test('send_message sends receiver, not phone', async () => {
    process.env.KIRIMI_DEVICE_ID = 'D-1'
    mockFetch()

    const res = await handleTool('send_message', { receiver: '628123', message: 'Halo' })

    assert.ok(!res.isError)
    assert.equal(calls[0].url, 'https://api.kirimi.id/v1/send-message')
    assert.equal(calls[0].body.receiver, '628123')
    assert.equal('phone' in calls[0].body, false)
    assert.equal(calls[0].body.device_id, 'D-1')
  })

  test('broadcast_message sends numbers as an array', async () => {
    process.env.KIRIMI_DEVICE_ID = 'D-1'
    mockFetch()

    await handleTool('broadcast_message', {
      label: 'promo',
      numbers: ['628111', '628222'],
      message: 'Halo',
    })

    assert.ok(Array.isArray(calls[0].body.numbers))
    assert.deepEqual(calls[0].body.numbers, ['628111', '628222'])
    assert.equal(calls[0].body.label, 'promo')
    assert.equal('phones' in calls[0].body, false)
  })

  test('save_contact sends nama and nomor', async () => {
    mockFetch()
    await handleTool('save_contact', { nama: 'Budi', nomor: '628111' })

    assert.equal(calls[0].body.nama, 'Budi')
    assert.equal(calls[0].body.nomor, '628111')
    assert.equal('name' in calls[0].body, false)
  })

  test('get_user_info works without any device configured', async () => {
    mockFetch()
    const res = await handleTool('get_user_info', {})

    assert.ok(!res.isError, 'device must be optional for account tools')
    assert.equal(calls[0].url, 'https://api.kirimi.id/v1/user-info')
  })

  test('send_otp defaults to the whatsapp method', async () => {
    mockFetch()
    await handleTool('send_otp', { phone: '628123' })

    assert.equal(calls[0].url, 'https://api.kirimi.id/v2/otp/send')
    assert.equal(calls[0].body.method, 'whatsapp')
    assert.equal('device_id' in calls[0].body, false)
  })

  test('send_otp with method device requires and sends device_id', async () => {
    mockFetch()
    await handleTool('send_otp', { phone: '628123', method: 'device', device_id: 'D-9' })

    assert.equal(calls[0].body.method, 'device')
    assert.equal(calls[0].body.device_id, 'D-9')
  })

  test('send_otp with waba_user sends waba_id and template_name', async () => {
    mockFetch()
    await handleTool('send_otp', {
      phone: '628123',
      method: 'waba_user',
      waba_id: 'WABA-1',
      template_name: 'otp_login',
    })

    assert.equal(calls[0].body.waba_id, 'WABA-1')
    assert.equal(calls[0].body.template_name, 'otp_login')
  })

  test('send_otp with waba_user fails clearly when waba_id is missing', async () => {
    mockFetch()
    const res = await handleTool('send_otp', { phone: '628123', method: 'waba_user' })

    assert.equal(res.isError, true)
    assert.match(res.content[0].text, /waba_id/u)
    assert.equal(calls.length, 0, 'must not call the API with an incomplete body')
  })

  test('waba_reply forwards the message object', async () => {
    mockFetch()
    await handleTool('waba_reply', {
      waba_id: 'W1',
      to: '628123',
      message: { type: 'text', text: 'Halo' },
    })

    assert.equal(calls[0].url, 'https://api.kirimi.id/v1/waba/messages/reply')
    assert.deepEqual(calls[0].body.message, { type: 'text', text: 'Halo' })
  })

  test('surfaces an API failure as an error result', async () => {
    mockFetch({ status: 400, body: { success: false, data: null, message: 'receiver is required' } })
    process.env.KIRIMI_DEVICE_ID = 'D-1'

    const res = await handleTool('send_message', { receiver: '628123', message: 'hi' })

    assert.equal(res.isError, true)
    assert.match(res.content[0].text, /receiver is required/u)
  })

  test('rejects a missing required argument before calling the API', async () => {
    process.env.KIRIMI_DEVICE_ID = 'D-1'
    mockFetch()
    const res = await handleTool('send_message', { message: 'hi' })

    assert.equal(res.isError, true)
    assert.match(res.content[0].text, /receiver/u)
    assert.equal(calls.length, 0)
  })

  test('rejects a message with neither text nor media', async () => {
    process.env.KIRIMI_DEVICE_ID = 'D-1'
    mockFetch()
    const res = await handleTool('send_message', { receiver: '628123' })

    assert.equal(res.isError, true)
    assert.match(res.content[0].text, /media_url|message/u)
    assert.equal(calls.length, 0)
  })

  test('accepts a media-only message without text', async () => {
    process.env.KIRIMI_DEVICE_ID = 'D-1'
    mockFetch()
    const res = await handleTool('send_message', {
      receiver: '628123',
      media_url: 'https://example.com/a.jpg',
    })

    assert.ok(!res.isError)
    assert.equal(calls[0].body.media_url, 'https://example.com/a.jpg')
    assert.equal('message' in calls[0].body, false)
  })

  test('returns an error for an unknown tool', async () => {
    mockFetch()
    const res = await handleTool('does_not_exist', {})

    assert.equal(res.isError, true)
    assert.match(res.content[0].text, /Unknown tool/u)
  })
})
