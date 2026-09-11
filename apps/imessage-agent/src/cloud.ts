import 'dotenv/config'
import { Spectrum } from 'spectrum-ts'
import { imessage } from 'spectrum-ts/providers/imessage'
import { BOT_NAME, handleMessage } from './flynn'

// Production entrypoint — Photon's managed iMessage lines only.
// Kept separate from index.ts per the Spectrum docs: importing
// @spectrum-ts/imessage-local here would drag its native SQLite dependency
// into the cloud deploy graph.
const PROJECT_ID = process.env.SPECTRUM_PROJECT_ID
const PROJECT_SECRET = process.env.SPECTRUM_PROJECT_SECRET

async function main() {
  if (!process.env.IMESSAGE_API_SECRET) {
    throw new Error('IMESSAGE_API_SECRET is required')
  }
  if (!PROJECT_ID || !PROJECT_SECRET) {
    throw new Error('SPECTRUM_PROJECT_ID and SPECTRUM_PROJECT_SECRET are required for cloud mode')
  }

  const app = await Spectrum({
    projectId: PROJECT_ID,
    projectSecret: PROJECT_SECRET,
    providers: [imessage.config()],
  })

  console.log(`${BOT_NAME} is running on managed iMessage lines. Send a link to prose, an essay, or a post.`)

  for await (const [space, message] of app.messages) {
    await handleMessage(space, message)
  }
}

main().catch((err) => {
  console.error(`${BOT_NAME} exited with error:`, err)
  process.exit(1)
})
