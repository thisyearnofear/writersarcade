'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Download, Zap, Grid3X3, Eye } from 'lucide-react'
import { ImageLightbox } from './image-lightbox'
import { ShareDropdown } from '@/components/ui/share-dropdown'
import { UserAttribution, AttributionPair } from '@/components/ui/user-attribution'
import { ipfsMetadataService, type GameCreator, type GameAuthor } from '@/lib/services/ipfs-metadata.service'
import { userIdentityService } from '@/lib/services/user-identity.service'

export interface ComicBookFinalePanelData {
  id: string
  narrativeText: string
  imageUrl: string | null
  imageModel: string
  userChoice?: string
}

interface ComicBookFinaleProps {
  gameTitle: string
  genre: string
  primaryColor: string
  panels: ComicBookFinalePanelData[]
  onBack: () => void
  onMint: (panelData: ComicBookFinalePanelData[], metadata?: { nftMetadataUri: string; gameMetadataUri: string; creator: GameCreator; author: GameAuthor }) => void
  isMinting?: boolean
  // Attribution data
  creatorWallet: string
  articleUrl: string
  authorParagraphUsername: string
  authorWallet?: string
  difficulty?: string
  userChoices?: Array<{ panelIndex: number; choice: string; timestamp: string }>
}

export function ComicBookFinale({
  gameTitle,
  genre,
  primaryColor,
  panels,
  onBack,
  onMint,
  isMinting = false,
  creatorWallet,
  articleUrl,
  authorParagraphUsername,
  authorWallet,
  difficulty = 'medium',
  userChoices = [],
}: ComicBookFinaleProps) {
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'nft-preview'>('single')
  const currentPanel = panels[currentPanelIndex]
  const totalPanels = panels.length

  // Prepare share data using existing game props
  const shareData = {
    gameTitle,
    genre,
    panelCount: totalPanels,
    title: gameTitle,
    text: `Check out my ${genre} comic "${gameTitle}" created with WritArcade! ${totalPanels} panels of interactive storytelling.`,
    url: window.location.href,
  }

  const handleNext = () => {
    if (currentPanelIndex < totalPanels - 1) {
      setCurrentPanelIndex(currentPanelIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentPanelIndex > 0) {
      setCurrentPanelIndex(currentPanelIndex - 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isImageExpanded) return // Lightbox handles navigation
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'ArrowLeft') handlePrev()
  }


  const handleMintWithMetadata = async () => {
    try {
      // 1. Generate comprehensive metadata
      const creator = await userIdentityService.getGameCreator(creatorWallet)
      const author = await userIdentityService.getGameAuthor(authorParagraphUsername, authorWallet)
      
      const gameData = {
        title: gameTitle,
        description: `Interactive ${genre.toLowerCase()} comic created on WritArcade. ${totalPanels} panels of AI-powered storytelling inspired by "${authorParagraphUsername}"'s work.`,
        genre: genre.toLowerCase(),
        difficulty: difficulty.toLowerCase(),
        panels,
        articleUrl
      }

      // 2. Upload metadata to IPFS
      const { nftMetadataUri, gameMetadataUri } = await ipfsMetadataService.uploadGamePackage(
        gameData,
        creator,
        author,
        userChoices
      )

      // 3. Call the original mint function with enhanced data
      onMint(panels, { nftMetadataUri, gameMetadataUri, creator, author })
      
    } catch (error) {
      console.error('Error preparing NFT metadata:', error)
      // Fallback to original mint behavior
      onMint(panels)
    }
  }

  const handleDownload = () => {
    // Create a canvas to combine all panels into one image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Add roundRect function to canvas context if not available
    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, width: number, height: number, radius: number) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
      };
    }

    const canvasWidth = 800; // Wider canvas for better text display
    const canvasHeight = totalPanels > 0 ? 600 + (totalPanels * 500) : 800; // Dynamic height based on panels
    const padding = 40;
    const headerHeight = 120;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fill background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Add title header - centered
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameTitle, canvasWidth / 2, 60);

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '18px Arial';
    ctx.fillText(`${genre} • ${totalPanels} Panels • WritArcade`, canvasWidth / 2, 100);

    // Center line separator
    ctx.strokeStyle = `${primaryColor}40`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, headerHeight);
    ctx.lineTo(canvasWidth - padding, headerHeight);
    ctx.stroke();

    // Add panels with centered layout
    let loadedImages = 0;
    const totalImages = panels.filter(p => p.imageUrl).length;

    panels.forEach((panel, idx) => {
      const yPosition = headerHeight + padding + (idx * 500);

      if (panel.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Draw image centered
          const imageWidth = 640;
          const imageHeight = 320;
          const imageX = (canvasWidth - imageWidth) / 2;
          const imageY = yPosition;

          // Draw image with rounded corners
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(imageX, imageY, imageWidth, imageHeight, 12);
          ctx.clip();
          ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight);
          ctx.restore();

          // Draw narrative text - centered and full text
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '16px Arial';
          ctx.textAlign = 'left';

          // Break text into lines that fit within the canvas width
          const maxWidth = 700;
          const lineHeight = 20;
          const textX = (canvasWidth - maxWidth) / 2;
          const textY = yPosition + imageHeight + 20;

          const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
            const words = text.split(' ');
            let line = '';
            let currentY = y;

            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              const testWidth = metrics.width;

              if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, x, currentY);
            return currentY;
          };

          const finalY = wrapText(panel.narrativeText, textX, textY, maxWidth, lineHeight);

          // Add separator between panels
          if (idx < panels.length - 1) {
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, finalY + 60);
            ctx.lineTo(canvasWidth - padding, finalY + 60);
            ctx.stroke();
          }

          loadedImages++;
          if (loadedImages === totalImages || totalImages === 0) {
            // All images loaded, download the canvas
            const link = document.createElement('a');
            link.download = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_comic.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }
        };
        img.src = panel.imageUrl;
      } else {
        // If no image, just draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';

        // Draw narrative text - centered and full text
        const maxWidth = 700;
        const lineHeight = 20;
        const textX = (canvasWidth - maxWidth) / 2;
        const textY = yPosition + 20;

        const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
          const words = text.split(' ');
          let line = '';
          let currentY = y;

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
              ctx.fillText(line, x, currentY);
              line = words[n] + ' ';
              currentY += lineHeight;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, x, currentY);
          return currentY;
        };

        const finalY = wrapText(panel.narrativeText, textX, textY, maxWidth, lineHeight);

        // Add separator between panels
        if (idx < panels.length - 1) {
          ctx.strokeStyle = '#444444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padding, finalY + 60);
          ctx.lineTo(canvasWidth - padding, finalY + 60);
          ctx.stroke();
        }

        loadedImages++;
        if (loadedImages === totalImages || totalImages === 0) {
          // All images loaded (or no images), download the canvas
          const link = document.createElement('a');
          link.download = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_comic.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      }
    });

    // If no panels, just download the text version
    if (totalPanels === 0) {
      const link = document.createElement('a');
      link.download = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_comic.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }

  return (
    <>
      <ImageLightbox
        isOpen={isImageExpanded}
        imageUrl={currentPanel.imageUrl}
        imageModel={currentPanel.imageModel}
        narrativeText={currentPanel.narrativeText}
        panelNumber={currentPanelIndex + 1}
        totalPanels={totalPanels}
        primaryColor={primaryColor}
        onClose={() => setIsImageExpanded(false)}
        onNavigate={(direction) => {
          if (direction === 'next' && currentPanelIndex < totalPanels - 1) {
            setCurrentPanelIndex(currentPanelIndex + 1)
          } else if (direction === 'prev' && currentPanelIndex > 0) {
            setCurrentPanelIndex(currentPanelIndex - 1)
          }
        }}
        canNavigatePrev={currentPanelIndex > 0}
        canNavigateNext={currentPanelIndex < totalPanels - 1}
      />
      <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}05, black)`,
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="border-b border-white/10 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Back to gameplay"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{gameTitle}</h1>
              <p className="text-sm text-gray-400">
                {genre} • Your Complete Story
              </p>
            </div>
          </div>

          {/* View mode selector */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('single')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Single
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setViewMode('grid')}
              className="gap-2"
            >
              <Grid3X3 className="w-4 h-4" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'nft-preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('nft-preview')}
              className="gap-2"
              style={{ 
                backgroundColor: viewMode === 'nft-preview' ? primaryColor : undefined,
                borderColor: primaryColor 
              }}
            >
              <Zap className="w-4 h-4" />
              NFT Preview
            </Button>
          </div>

          {/* Panel counter (only show in single mode) */}
          {viewMode === 'single' && (
            <div className="text-right">
              <div
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                {currentPanelIndex + 1}/{totalPanels}
              </div>
              <p className="text-xs text-gray-400">Panels</p>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl space-y-6">
          
          {/* SINGLE PANEL VIEW */}
          {viewMode === 'single' && (
            <div
              className="rounded-xl overflow-hidden border-4 shadow-2xl max-w-4xl mx-auto"
              style={{
                borderColor: primaryColor,
                backgroundColor: 'rgba(0,0,0,0.4)',
              }}
            >
              {/* Image */}
              <div
                className="w-full h-96 md:h-[28rem] overflow-hidden bg-black relative group cursor-pointer"
                onClick={() => currentPanel.imageUrl && setIsImageExpanded(true)}
              >
                {currentPanel.imageUrl ? (
                  <>
                    <img
                      src={currentPanel.imageUrl}
                      alt={`Panel ${currentPanelIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200 opacity-0 group-hover:opacity-100">
                      <div className="text-white text-sm font-medium">Click to expand</div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                    <p className="text-gray-500">No image available</p>
                  </div>
                )}
              </div>

              {/* Model badge */}
              <div className="px-6 py-3 bg-black/40 border-b border-white/10 flex items-center gap-2">
                <span className="text-xs text-gray-400">Generated with:</span>
                <span
                  className="text-xs font-mono px-2 py-1 rounded"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    color: primaryColor,
                  }}
                >
                  {currentPanel.imageModel}
                </span>
              </div>

              {/* Narrative in speech bubble */}
              <div className="p-6 md:p-8 space-y-4">
                <div
                  className="relative p-4 rounded-lg border-2"
                  style={{
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}10`,
                  }}
                >
                  {/* Speech bubble tail */}
                  <div
                    className="absolute -bottom-3 left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
                    style={{ borderTopColor: primaryColor }}
                  ></div>

                  <p className="text-gray-100 text-base md:text-lg leading-relaxed font-medium">
                    {currentPanel.narrativeText}
                  </p>
                </div>

                {/* User choice indicator */}
                {currentPanel.userChoice && (
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      borderLeft: `3px solid ${primaryColor}`,
                    }}
                  >
                    <p className="text-gray-300">
                      <span className="text-gray-500">Your choice: </span>
                      <span className="font-semibold">{currentPanel.userChoice}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {panels.map((panel, idx) => (
                <div
                  key={panel.id}
                  className="rounded-lg overflow-hidden border-2 shadow-lg cursor-pointer transition-transform hover:scale-105"
                  style={{
                    borderColor: idx === currentPanelIndex ? primaryColor : 'rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                  }}
                  onClick={() => setCurrentPanelIndex(idx)}
                >
                  <div className="aspect-square overflow-hidden bg-black">
                    {panel.imageUrl ? (
                      <img
                        src={panel.imageUrl}
                        alt={`Panel ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <p className="text-gray-500 text-sm">No image</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: primaryColor }}>
                        Panel {idx + 1}
                      </span>
                      <span className="text-xs text-gray-400">{panel.imageModel}</span>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">
                      {panel.narrativeText}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* NFT PREVIEW */}
          {viewMode === 'nft-preview' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>
                  📜 Your NFT Comic Preview
                </h2>
                <p className="text-gray-400 text-sm">
                  This is how your comic will appear as an NFT
                </p>
              </div>
              
              <div
                className="rounded-xl p-6 border-4 shadow-2xl max-w-2xl mx-auto"
                style={{
                  borderColor: primaryColor,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                }}
              >
                {/* Comic title header */}
                <div className="text-center mb-6 pb-4 border-b border-white/20">
                  <h3 className="text-2xl font-bold mb-2">{gameTitle}</h3>
                  <p className="text-sm text-gray-400 mb-3">{genre} • {totalPanels} Panels</p>
                  
                  {/* Attribution in NFT preview */}
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <span className="text-gray-500">Created by</span>
                    <UserAttribution 
                      type="creator" 
                      walletAddress={creatorWallet} 
                      size="sm"
                      showLink={false}
                    />
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">Inspired by</span>
                    <UserAttribution 
                      type="author" 
                      paragraphUsername={authorParagraphUsername}
                      authorWallet={authorWallet}
                      size="sm"
                      showLink={false}
                    />
                  </div>
                </div>

                {/* Vertical comic strip layout */}
                <div className="space-y-6">
                  {panels.map((panel, idx) => (
                    <div
                      key={panel.id}
                      className="rounded-xl overflow-hidden border-2"
                      style={{ borderColor: primaryColor + '40' }}
                    >
                      {/* Image */}
                      <div className="w-full h-48 overflow-hidden bg-black">
                        {panel.imageUrl ? (
                          <img
                            src={panel.imageUrl}
                            alt={`Scene ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                            <span className="text-gray-500 text-sm">No image</span>
                          </div>
                        )}
                      </div>

                      {/* Narrative text - centered and full text */}
                      <div className="p-4 bg-black/60">
                        <p className="text-sm leading-relaxed text-gray-200 text-center">
                          {panel.narrativeText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* NFT metadata footer */}
                <div className="mt-6 pt-4 border-t border-white/20 text-center">
                  <p className="text-xs text-gray-400">
                    🎨 Generated with WritArcade • Unique Comic NFT
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation controls (only show in single mode) */}
          {viewMode === 'single' && (
            <div className="flex items-center justify-between">
              <Button
                onClick={handlePrev}
                disabled={currentPanelIndex === 0}
                className="px-4 py-2"
                variant="outline"
              >
                ← Previous
              </Button>

              {/* Page indicator */}
              <div className="flex items-center gap-2">
                {panels.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPanelIndex(idx)}
                    className="w-3 h-3 rounded-full transition-all"
                    style={{
                      backgroundColor:
                        idx === currentPanelIndex ? primaryColor : 'rgba(255,255,255,0.2)',
                      width: idx === currentPanelIndex ? '32px' : '12px',
                    }}
                    title={`Go to panel ${idx + 1}`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                disabled={currentPanelIndex === totalPanels - 1}
                className="px-4 py-2"
                variant="outline"
              >
                Next →
              </Button>
            </div>
          )}

          {/* Summary info for grid/NFT views */}
          {(viewMode === 'grid' || viewMode === 'nft-preview') && (
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                {viewMode === 'grid' ? 'Click any panel to select it' : 'This is your complete comic story'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Action buttons */}
      <div
        className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md"
        style={{
          boxShadow: `0 -4px 20px ${primaryColor}10`,
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          {/* Attribution & Info */}
          <div className="space-y-3">
            <AttributionPair
              creatorWallet={creatorWallet}
              authorParagraphUsername={authorParagraphUsername}
              authorWallet={authorWallet}
              size="sm"
              layout="horizontal"
            />
            <div className="text-xs text-gray-500">
              {totalPanels} panels • {genre} • Inspired by <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 underline">original article</a>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <ShareDropdown 
              data={shareData}
              variant="outline" 
            />

            <Button
              variant="outline"
              className="gap-2"
              onClick={handleDownload}
              title="Download your comic as image"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>

            <Button
              onClick={handleMintWithMetadata}
              disabled={isMinting}
              className="gap-2"
              style={{
                backgroundColor: primaryColor,
                color: 'white',
              }}
            >
              <Zap className="w-4 h-4" />
              {isMinting ? 'Preparing NFT...' : 'Mint as NFT'}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
