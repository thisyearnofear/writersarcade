import 'dotenv/config'
import { Spectrum } from 'spectrum-ts'
import { imessage } from 'spectrum-ts/providers/imessage'
import { terminal } from 'spectrum-ts/providers/terminal'
import { localIMessage } from '@spectrum-ts/imessage-local'
import { BOT_NAME, handleMessage } from './flynn'

// Local/dev entrypoint — prefers the cloud provider when SPECTRUM creds are
// set, falls back to this Mac's Messages database, optionally the terminal.
const PROJECT_ID = process.env.SPECTRUM_PROJECT_ID
const PROJECT_SECRET = process.env.SPECTRUM_PROJECT_SECRET

async function main() {
  if (!process.env.IMESSAGE_API_SECRET) {
    throw new Error('IMESSAGE_API_SECRET is required')
  }

  const providers = []

  if (PROJECT_ID && PROJECT_SECRET) {
    providers.push(imessage.config())
    console.log(`[${BOT_NAME}] cloud iMessage provider enabled`)
  } else if (process.env.LOCAL_IMESSAGE !== 'false') {
    providers.push(localIMessage.config())
    console.log(`[${BOT_NAME}] local iMessage provider enabled (this Mac)`)
  }

  if (process.env.ENABLE_TERMINAL === 'true') {
    providers.push(terminal.config())
    console.log(`[${BOT_NAME}] terminal test mode enabled`)
  }

  if (providers.length === 0) {
    throw new Error(
      `No providers enabled. Set SPECTRUM_PROJECT_ID/SPECTRUM_PROJECT_SECRET, LOCAL_IMESSAGE=true, or ENABLE_TERMINAL=true.`
    )
  }

  const spectrumOptions =
    PROJECT_ID && PROJECT_SECRET
      ? { projectId: PROJECT_ID, projectSecret: PROJECT_SECRET, providers }
      : { providers }

  const app = await Spectrum(spectrumOptions as any)

  console.log(`${BOT_NAME} is running. Send a link to prose, an essay, or a post.`)

  for await (const [space, message] of app.messages) {
    await handleMessage(space, message)
  }
}

main().catch((err) => {
  console.error(`${BOT_NAME} exited with error:`, err)
  process.exit(1)
})
