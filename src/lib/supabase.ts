import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv, missingSupabaseEnvMessage } from './supabase-env'

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>
type MockQueryResult = ReturnType<typeof createMissingQueryResult>
type MockQueryPromise = Promise<MockQueryResult>
type MockQueryBuilder = {
  select: (...args: unknown[]) => MockQueryBuilder
  insert: (...args: unknown[]) => MockQueryBuilder
  update: (...args: unknown[]) => MockQueryBuilder
  delete: (...args: unknown[]) => MockQueryBuilder
  upsert: (...args: unknown[]) => MockQueryBuilder
  eq: (...args: unknown[]) => MockQueryBuilder
  in: (...args: unknown[]) => MockQueryBuilder
  limit: (...args: unknown[]) => MockQueryBuilder
  ilike: (...args: unknown[]) => MockQueryBuilder
  gte: (...args: unknown[]) => MockQueryBuilder
  lte: (...args: unknown[]) => MockQueryBuilder
  or: (...args: unknown[]) => MockQueryBuilder
  order: (...args: unknown[]) => MockQueryBuilder
  single: (...args: unknown[]) => MockQueryPromise
  maybeSingle: (...args: unknown[]) => MockQueryPromise
  then: MockQueryPromise['then']
  catch: MockQueryPromise['catch']
  finally: MockQueryPromise['finally']
}

let hasWarnedMissingEnv = false

function warnMissingSupabaseEnv() {
  if (hasWarnedMissingEnv || typeof window === 'undefined') return

  hasWarnedMissingEnv = true
  console.warn(missingSupabaseEnvMessage)
}

function createMissingQueryResult() {
  return {
    data: null,
    error: new Error(missingSupabaseEnvMessage),
    count: null,
    status: 503,
    statusText: 'Supabase env missing',
  }
}

function createMockQueryBuilder(): MockQueryBuilder {
  const result = Promise.resolve(createMissingQueryResult())
  const builder: MockQueryBuilder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    in: () => builder,
    limit: () => builder,
    ilike: () => builder,
    gte: () => builder,
    lte: () => builder,
    or: () => builder,
    order: () => builder,
    single: () => Promise.resolve(createMissingQueryResult()),
    maybeSingle: () => Promise.resolve(createMissingQueryResult()),
    then: result.then.bind(result),
    catch: result.catch.bind(result),
    finally: result.finally.bind(result),
  }

  return builder
}

function createMockBrowserClient(): BrowserSupabaseClient {
  const authError = new Error(missingSupabaseEnvMessage)
  const subscription = { unsubscribe() {} }

  const mockClient = {
    from() {
      warnMissingSupabaseEnv()
      return createMockQueryBuilder()
    },
    channel() {
      warnMissingSupabaseEnv()
      return {
        on() {
          return this
        },
        subscribe() {
          return this
        },
      }
    },
    removeChannel() {
      return Promise.resolve('ok')
    },
    storage: {
      from() {
        warnMissingSupabaseEnv()
        return {
          upload: async () => ({ data: null, error: authError }),
          remove: async () => ({ data: null, error: authError }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }
      },
    },
    auth: {
      async getUser() {
        warnMissingSupabaseEnv()
        return { data: { user: null }, error: authError }
      },
      async getSession() {
        warnMissingSupabaseEnv()
        return { data: { session: null }, error: authError }
      },
      async signInWithPassword() {
        warnMissingSupabaseEnv()
        return { data: { user: null, session: null }, error: authError }
      },
      async signUp() {
        warnMissingSupabaseEnv()
        return { data: { user: null, session: null }, error: authError }
      },
      async setSession() {
        warnMissingSupabaseEnv()
        return { data: { session: null, user: null }, error: authError }
      },
      async updateUser() {
        warnMissingSupabaseEnv()
        return { data: { user: null }, error: authError }
      },
      async signOut() {
        warnMissingSupabaseEnv()
        return { error: null }
      },
      onAuthStateChange() {
        warnMissingSupabaseEnv()
        return { data: { subscription } }
      },
    },
  }

  return mockClient as unknown as BrowserSupabaseClient
}

const { url, anonKey, isConfigured } = getSupabasePublicEnv()

export const isSupabaseConfigured = isConfigured

export const supabase = isConfigured
  ? createBrowserClient(url!, anonKey!)
  : createMockBrowserClient()
