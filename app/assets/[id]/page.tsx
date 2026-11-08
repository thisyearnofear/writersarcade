import { redirect } from 'next/navigation'

/** Asset detail pages retired with the marketplace — send visitors to the arcade. */
export default function AssetDetailRedirectPage() {
  redirect('/games')
}
