/**
 * Platform signer private key for server-side transactions (daily challenge,
 * Inco vaults). PLATFORM_SIGNER_PRIVATE_KEY is canonical;
 * STORY_PLATFORM_PRIVATE_KEY is a legacy name kept so prod keeps working
 * without an env change.
 */
export function getPlatformSignerKey(): string {
  return (
    process.env.PLATFORM_SIGNER_PRIVATE_KEY ||
    process.env.DAILY_CHALLENGE_MANAGER_PRIVATE_KEY ||
    process.env.STORY_PLATFORM_PRIVATE_KEY ||
    ''
  )
}
