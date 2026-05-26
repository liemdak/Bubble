/**
 * Firebase Admin SDK — SERVER-SIDE ONLY.
 * Never import this in client components or pages.
 *
 * Required env vars (set in .env.local and Vercel dashboard):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (paste the full key including \n — wrap in double quotes in .env)
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let _app: App | null = null
let _db: Firestore | null = null

function getApp(): App {
  if (_app) return _app

  // Already initialised by another import path (e.g. during hot-reload)
  if (getApps().length > 0) {
    _app = getApps()[0]
    return _app
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin env vars.\n' +
      'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local'
    )
  }

  _app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // .env stores \n as literal \\n — convert back to real newlines
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  })

  return _app
}

export function getDb(): Firestore {
  if (_db) return _db
  getApp()
  _db = getFirestore()
  return _db
}
