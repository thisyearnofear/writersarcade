import axios from 'axios'
import { marked } from 'marked'
import { processArticleFromUrl, getPublicationSubscriberCount, fetchPublicationBySlug, parseParagraphUrl } from '@/lib/paragraph-sdk'


export interface ContentSource {
  url: string
  type: 'newsletter' | 'blog' | 'article' | 'unknown'
  title?: string
  author?: string
  publishedAt?: Date
}

export interface ProcessedContent {
  text: string
  title?: string
  author?: string
  authorWallet?: string
  publishedAt?: Date
  publicationName?: string
  publicationSummary?: string
  subscriberCount?: number
  wordCount: number
  estimatedReadTime: number
  source: ContentSource
}

/**
 * Consolidated Content Processing Service
 * Merges scraper.js, hackernews.js functionality with enhancements
 */
export class ContentProcessorService {
  
  
  
  /**
   * Process content from URL - enhanced consolidation of existing scrapers
   */
  static async processUrl(url: string): Promise<ProcessedContent> {
    try {
      // Validate URL format first
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL format. Please ensure the URL starts with http:// or https://')
      }

      // Determine content type
      const contentType = this.detectContentType(url)
      
      // Extract content based on type
      let extractedData: { text: string; metadata: Partial<ProcessedContent> }
      
      if (this.isHackerNewsUrl(url)) {
        extractedData = await this.processHackerNewsUrl(url)
      } else {
        extractedData = await this.scrapeGenericUrl(url)
      }
      
      const extractedText = extractedData.text
      const metadata = extractedData.metadata || {}
      
      // Process and clean the text
      const cleanText = this.cleanAndProcessText(extractedText)
      const wordCount = this.countWords(cleanText)
      const estimatedReadTime = Math.ceil(wordCount / 200) // ~200 WPM average
      
      return {
        text: cleanText,
        wordCount,
        estimatedReadTime,
        source: { url, type: contentType },
        ...metadata,
      }
    } catch (error) {
      console.error('Content processing error:', error)
      
      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('Invalid URL')) {
          throw error
        }
        if (error.message.includes('Paragraph')) {
          throw new Error('This URL is not from a supported source. We support Substack, Medium, dev.to, Hashnode, and HackerNews.')
        }
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw new Error('The URL took too long to load. The website might be down or blocking our access.')
        }
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          throw new Error('This URL does not exist or is no longer accessible. Please check the link.')
        }
        throw new Error(`Failed to extract content from URL. ${error.message}`)
      }
      
      throw new Error('Failed to process content from URL. Please check that the URL is valid and publicly accessible.')
    }
  }
  
  /**
   * Process multiple URLs (for newsletter archives, etc.)
   */
  static async processMultipleUrls(urls: string[]): Promise<ProcessedContent[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.processUrl(url))
    )
    
    return results
      .filter((result): result is PromiseFulfilledResult<ProcessedContent> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
  }
  
  /**
   * Enhanced URL scraping with SDK integration
   */
  private static async scrapeGenericUrl(url: string): Promise<{ text: string; metadata: Partial<ProcessedContent> }> {
    if (!url.includes('paragraph')) {
      throw new Error('Only Paragraph URLs supported');
    }

    try {
      // Use the SDK to process the article
      const article = await processArticleFromUrl(url);
      
      if (!article) {
        throw new Error('Failed to process article');
      }

      // Get subscriber count
      const subscriberCount = await getPublicationSubscriberCount(article.source.publicationId);

      const metadata: Partial<ProcessedContent> = {
        title: article.title,
        author: article.author,
        publishedAt: article.publishedAt,
        publicationName: article.source.publicationName,
        subscriberCount: subscriberCount || undefined,
      };

      return { text: article.plainText, metadata };
    } catch (error) {
      console.error('Paragraph API error:', error);
      throw new Error('Failed to extract content and metadata from Paragraph API');
    }
  }
  
  /**
   * Process HackerNews URLs (enhanced from hackernews.js)
   */
  private static async processHackerNewsUrl(url: string): Promise<{
    text: string
    metadata: Partial<ProcessedContent>
  }> {
    try {
      // Extract story ID from HN URL
      const storyId = this.extractHackerNewsId(url)
      
      if (storyId) {
        // Get HN story data
        const hnResponse = await axios.get(
          `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`,
          { timeout: 5000 }
        )
        
        const story = hnResponse.data
        
        if (story?.url) {
          // Get the actual article content
          const article = await this.scrapeGenericUrl(story.url)
          
          return {
            text: article.text,
            metadata: {
              ...article.metadata,
              title: story.title || article.metadata.title,
              author: story.by || article.metadata.author,
              publishedAt: story.time ? new Date(story.time * 1000) : article.metadata.publishedAt,
            }
          }
        } else if (story?.text) {
          // HN text post
          return {
            text: story.text,
            metadata: {
              title: story.title,
              author: story.by,
              publishedAt: story.time ? new Date(story.time * 1000) : undefined,
            }
          }
        }
      }
      
      throw new Error('Unable to extract HackerNews content')
    } catch (error) {
      console.error('HackerNews processing error:', error)
      // Fallback to regular scraping
      const fallback = await this.scrapeGenericUrl(url);
      return {
        text: fallback.text,
        metadata: fallback.metadata
      };
    }
  }
  
  /**
   * Detect content type from URL patterns
   */
  private static detectContentType(url: string): ContentSource['type'] {
    const hostname = new URL(url).hostname.toLowerCase()
    
    if (hostname.includes('substack.com')) return 'newsletter'
    if (hostname.includes('medium.com')) return 'blog'
    if (hostname.includes('dev.to')) return 'blog'
    if (hostname.includes('hashnode.')) return 'blog'
    if (hostname.includes('news.ycombinator.com')) return 'article'
    
    return 'unknown'
  }
  
  /**
   * Check if URL is from HackerNews
   */
  private static isHackerNewsUrl(url: string): boolean {
    return url.includes('news.ycombinator.com')
  }
  
  /**
   * Extract HackerNews story ID from URL
   */
  private static extractHackerNewsId(url: string): string | null {
    const match = url.match(/item\?id=(\d+)/)
    return match ? match[1] : null
  }
  
  /**
   * Clean and process extracted text
   */
  private static cleanAndProcessText(text: string): string {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim()
    
    // Remove HTML entities if any leaked through
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
    
    // Remove excessive line breaks
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n')
    
    // Limit length for AI processing (keep first ~4000 chars for context)
    if (cleaned.length > 4000) {
      cleaned = cleaned.substring(0, 4000) + '...'
    }
    
    return cleaned
  }
  
  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text.trim().split(/\s+/).length
  }
  
  /**
   * Process markdown content to plain text
   */
  static async processMarkdown(markdown: string): Promise<string> {
    // Convert markdown to HTML then strip HTML tags
    const html = await marked(markdown)
    const text = html.replace(/<[^>]*>/g, ' ')
    return this.cleanAndProcessText(text)
  }
  
  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }
}