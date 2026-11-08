import { redirect } from 'next/navigation'

/** The asset marketplace was sunset (21 assets, dormant since mid-2026).
 *  Redirect preserves old links and SEO equity. */
export default function AssetsRedirectPage() {
  redirect('/games')
}
