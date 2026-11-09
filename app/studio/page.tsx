import { redirect } from 'next/navigation'

// Studio folded into /generate — pasted copy is now a source option in the
// create wizard (?source=text preselects it). Keep the route alive so old
// links, bookmarks, and auth redirects don't 404.
export default function StudioPage() {
  redirect('/generate?source=text')
}
