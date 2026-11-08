import { redirect } from 'next/navigation'

/** Asset-pack composition retired with the marketplace — game creation lives at /generate. */
export default function AssetCreateRedirectPage() {
  redirect('/generate')
}
