import { redirect } from 'next/navigation'

/** The Workshop drove the sunset asset-pack pipeline. Game creation lives at /generate. */
export default function WorkshopRedirectPage() {
  redirect('/generate')
}
