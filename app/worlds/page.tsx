import type { Metadata } from 'next'
import { WorldBuilder } from '@/components/worlds/world-builder'

export const metadata: Metadata = {
  title: 'Prompt → World — describe a place, walk into it',
  description:
    'Type a scene in plain language and explore it as an explorable 3D world. AI set design, browser-native, no account required.',
  openGraph: {
    title: 'Prompt → World — writersarcade',
    description: 'Describe a place in plain language. Walk into it as an explorable 3D world.',
  },
}

export default function WorldsPage() {
  return <WorldBuilder />
}
