/**
 * Undo/Redo Manager
 * Manages state history for graceful recovery from deletions
 */

export interface HistoryState<T> {
  state: T
  timestamp: number
  description: string
}

export class UndoManager<T> {
  private history: HistoryState<T>[] = []
  private currentIndex: number = -1
  private maxHistory: number

  constructor(maxHistory: number = 20) {
    this.maxHistory = maxHistory
  }

  /**
   * Push a new state onto the history
   */
  push(state: T, description: string = ''): void {
    // Remove any redo history if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    this.history.push({
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      timestamp: Date.now(),
      description
    })

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    } else {
      this.currentIndex++
    }
  }

  /**
   * Undo to previous state
   */
  undo(): HistoryState<T> | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      return this.history[this.currentIndex]
    }
    return null
  }

  /**
   * Redo to next state
   */
  redo(): HistoryState<T> | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      return this.history[this.currentIndex]
    }
    return null
  }

  /**
   * Get current state
   */
  current(): HistoryState<T> | null {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : null
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * Get description of last action for UI
   */
  lastActionDescription(): string {
    if (this.currentIndex >= 0) {
      return this.history[this.currentIndex].description
    }
    return ''
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
  }
}
