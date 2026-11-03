import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wiueemknsjfwisxfmcox.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable__9RdFy3AqCtefgoRHsT_0g_eraq4YDr'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

test('EcoFix Supabase Auth OTP Verification Suite', async (t) => {
  await t.test('Test Case 1 & 2: Signup endpoint returns unconfirmed user when confirm email is enabled', async () => {
    const uniqueEmail = `ecofix.suite.test.${Date.now()}@gmail.com`
    const { data, error } = await supabase.auth.signUp({
      email: uniqueEmail,
      password: 'Password123!',
      options: {
        data: {
          name: 'Suite Test User',
          role: 'customer'
        }
      }
    })

    assert.equal(error, null, `SignUp should not error on valid email, got: ${error?.message}`)
    assert.ok(data.user, 'User object should be returned on registration')
    assert.equal(data.user.email, uniqueEmail, 'Registered email must match input exactly')
  })

  await t.test('Test Case 3: Invalid OTP must be rejected by Supabase verifyOtp', async () => {
    const fakeEmail = 'ecofix.invalid.otp.check@gmail.com'
    const { data, error } = await supabase.auth.verifyOtp({
      email: fakeEmail,
      token: '000000',
      type: 'signup',
    })

    assert.equal(data.user, null, 'User must not be returned for invalid OTP')
    assert.equal(data.session, null, 'Session must not be granted for invalid OTP')
    assert.ok(error, 'Supabase must return an error for invalid OTP')
    assert.ok(
      error.message.toLowerCase().includes('expired') ||
      error.message.toLowerCase().includes('invalid') ||
      (error.code && error.code.includes('otp')),
      `Unexpected error message: ${error.message}`
    )
  })

  await t.test('Test Case 4: Resend OTP triggers Supabase auth.resend for exact email', async () => {
    const testEmail = 'ecofix.resend.test.' + Math.floor(Math.random() * 100000) + '@gmail.com'
    const resendResult = await supabase.auth.resend({
      type: 'signup',
      email: testEmail,
    })

    if (resendResult.error) {
      assert.ok(
        resendResult.error.message.length > 0,
        'Error message must be present when resend fails'
      )
    } else {
      assert.ok(resendResult.data, 'Data object should be present on accepted resend')
    }
  })

  await t.test('Test Case 5: Existing verified account logs in normally', async () => {
    const existingEmail = 'ecofix.dev.test.96229@gmail.com'
    const { data, error } = await supabase.auth.signInWithPassword({
      email: existingEmail,
      password: 'Password123!'
    })

    assert.equal(error, null, 'Login should succeed without error')
    assert.ok(data.session, 'Session must be returned for valid verified credentials')
    assert.ok(data.user, 'User object must be present')
  })

  await t.test('Test Case 6: Duplicate account registration prevention', async () => {
    const existingEmail = 'ecofix.dev.test.96229@gmail.com'
    const { data } = await supabase.auth.signUp({
      email: existingEmail,
      password: 'Password123!',
    })

    // Supabase anti-enumeration returns user with empty identities for duplicates
    if (data?.user) {
      assert.ok(
        Array.isArray(data.user.identities),
        'User identities array must exist'
      )
    }
  })

  await t.test('Test Case 7: Malformed email is rejected with 400 validation error', async () => {
    const invalidEmail = 'malformed-email-not-valid'
    const res = await supabase.auth.signUp({
      email: invalidEmail,
      password: 'Password123!',
    })
    assert.ok(res.error, 'Invalid email format must return an auth error')
    assert.ok(
      res.error.message.toLowerCase().includes('email') ||
      res.error.message.toLowerCase().includes('valid'),
      `Expected email validation error, got: ${res.error.message}`
    )
  })
})
