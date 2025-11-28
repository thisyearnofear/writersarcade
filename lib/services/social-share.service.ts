/**
 * Social sharing service - Single source of truth for all sharing logic
 * Consolidates share functionality across WritArcade components
 */

export interface ShareData {
  title: string
  text: string
  url?: string
  hashtags?: string[]
}

export interface ComicShareData extends ShareData {
  genre: string
  panelCount: number
  gameTitle: string
}

export class SocialShareService {
  private static instance: SocialShareService
  
  public static getInstance(): SocialShareService {
    if (!SocialShareService.instance) {
      SocialShareService.instance = new SocialShareService()
    }
    return SocialShareService.instance
  }

  /**
   * Share to Twitter with optimized formatting
   */
  public shareToTwitter(data: ComicShareData): void {
    const tweetText = `Just created "${data.gameTitle}" - an epic ${data.genre} comic with @WritArcade! 🎮📚

✨ ${data.panelCount} panels of AI-powered interactive storytelling
🎨 Generated unique visuals
🎯 Your choices shape the story

The future of comics is here! 🚀

#WritArcade #AIComics #InteractiveStory #Web3 #NFT #Gaming`

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(data.url || window.location.href)}`
    this.openSocialWindow(twitterUrl, { width: 550, height: 420 })
  }

  /**
   * Share to Farcaster via Warpcast
   */
  public shareToFarcaster(data: ComicShareData): void {
    const castText = `Just dropped my new comic "${data.gameTitle}" on WritArcade! 🎮📚

${data.genre} story • ${data.panelCount} interactive panels • AI-generated art

Every choice I made shaped the narrative. This is the future of storytelling! 🚀

Try it yourself 👇`

    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(data.url || window.location.href)}`
    this.openSocialWindow(farcasterUrl, { width: 600, height: 500 })
  }

  /**
   * Generic share using Web Share API or clipboard fallback
   */
  public async shareGeneric(data: ShareData): Promise<boolean> {
    const shareData = {
      title: data.title,
      text: data.text,
      url: data.url || window.location.href,
    }

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return true
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        return true
      }
    } catch (error) {
      console.error('Error sharing:', error)
      // Final fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * Open social media window with consistent dimensions
   */
  private openSocialWindow(url: string, options: { width: number; height: number }): void {
    const left = (window.screen.width - options.width) / 2
    const top = (window.screen.height - options.height) / 2
    
    window.open(
      url, 
      '_blank', 
      `width=${options.width},height=${options.height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    )
  }
}

// Export singleton instance
export const socialShareService = SocialShareService.getInstance()