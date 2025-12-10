"use client";

import { useState, useEffect } from "react";
import { PaymentButton } from "./PaymentButton";
import { type WriterCoin } from "@/lib/writerCoins";
import type { Game } from "@/domains/games/types";

interface GamePlayerProps {
  game: Game;
  onBack: () => void;
  writerCoin?: WriterCoin;
}

export function GamePlayer({ game, onBack, writerCoin }: GamePlayerProps) {
  const [gameContent, setGameContent] = useState<string>("");
  const [options, setOptions] = useState<Array<{ id: number; text: string }>>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 11));
  const [gameHistory, setGameHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [mintResult, setMintResult] = useState<{
    txHash: string;
    storyIpId?: string;
  } | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  // Start the game
  useEffect(() => {
    const startGame = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/games/${game.slug}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) throw new Error("Failed to start game");

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";
        let currentContent = "";
        let currentOptions: typeof options = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "content") {
                  currentContent += data.content;
                  setGameContent(currentContent);
                } else if (data.type === "options") {
                  currentOptions = data.options;
                  setOptions(currentOptions);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        setGameHistory([{ role: "assistant", content: currentContent }]);
      } catch (error) {
        console.error("Error starting game:", error);
        setGameContent("Failed to start game. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    startGame();
  }, [game.slug, sessionId]);

  const handleMintSuccess = async (transactionHash: string, storyIPAssetId?: string) => {
    setShowMintDialog(false);
    setIsMinting(false);
    setMintResult({ txHash: transactionHash, storyIpId: storyIPAssetId });
    setShowSuccessDialog(true);
  };

  const handleChoice = async (option: { id: number; text: string }) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Add user choice to history
      const newHistory = [
        ...gameHistory,
        { role: "user" as const, content: option.text },
      ];
      setGameHistory(newHistory);

      const response = await fetch("/api/games/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: gameHistory,
          userInput: option.text,
          sessionId,
          gameSlug: game.slug,
          model: game.promptModel || "gpt-4o-mini",
        }),
      });

      if (!response.ok) throw new Error("Failed to continue game");

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let currentContent = "";
      let currentOptions: typeof options = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "content") {
                currentContent += data.content;
                setGameContent((prev) => prev + data.content);
              } else if (data.type === "options") {
                currentOptions = data.options;
                setOptions(currentOptions);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      setGameHistory([
        ...newHistory,
        { role: "assistant", content: currentContent },
      ]);
      setGameContent((prev) => prev + "\n\n" + currentContent);
    } catch (error) {
      console.error("Error continuing game:", error);
      setGameContent(
        (prev) => prev + "\n\nFailed to continue game. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{game.title}</h2>
          <p className="text-sm text-purple-300">
            {game.genre} • {game.subgenre}
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-purple-300 hover:text-purple-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* Game Description and Metadata */}
      <div className="rounded-lg bg-purple-900/30 p-4 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Game Description
          </h3>
          <p className="text-sm text-purple-200">{game.description}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Article Metadata
          </h3>
          <ul className="space-y-2 text-sm text-purple-200">
            <li>
              <span className="font-medium text-purple-100">Publication:</span>{" "}
              {game.publicationName || "Unknown"}
              {game.publicationSummary && (
                <p className="text-xs text-purple-300 mt-1">
                  {game.publicationSummary}
                </p>
              )}
            </li>
            <li>
              <span className="font-medium text-purple-100">Subscribers:</span>{" "}
              {game.subscriberCount?.toLocaleString() || "0"}
            </li>
            <li>
              <span className="font-medium text-purple-100">Author:</span>{" "}
              {game.authorParagraphUsername || "Unknown"} (Wallet: {game.authorWallet || "N/A"})
            </li>
            <li>
              <span className="font-medium text-purple-100">Published:</span>{" "}
              {game.articlePublishedAt
                ? new Date(game.articlePublishedAt).toLocaleDateString()
                : "Unknown"}
            </li>
          </ul>
        </div>
      </div>

      {/* Game Content */}
      <div className="rounded-lg bg-purple-950/50 border border-purple-700/50 p-6">
        <div className="space-y-4">
          <div className="prose prose-invert max-w-none text-purple-50">
            <p className="whitespace-pre-wrap leading-relaxed">{gameContent}</p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
            </div>
          )}

          {/* Game Options */}
          {options.length > 0 && !isLoading && (
            <div className="space-y-2 pt-4">
              <p className="text-xs uppercase tracking-wider text-purple-400">
                Choose your action:
              </p>
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleChoice(option)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-purple-500/50 bg-purple-900/30 px-4 py-3 text-left text-sm text-purple-200 transition-all hover:border-purple-400 hover:bg-purple-900/50 disabled:opacity-50"
                >
                  <span className="font-medium">{option.id}.</span>{" "}
                  {option.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-purple-500/50 px-4 py-3 font-medium text-purple-300 transition-colors hover:border-purple-400 hover:bg-white/5"
        >
          Exit Game
        </button>
        <button
          onClick={() => setShowMintDialog(true)}
          disabled={isMinting}
          className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mint as NFT
        </button>
      </div>

      {/* Mint Dialog */}
      {showMintDialog && writerCoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-purple-900/95 p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white">
              Mint Game as NFT
            </h3>
            <p className="mb-6 text-purple-200">
              Mint this game as an NFT on Base to prove ownership and share it
              on Farcaster.
            </p>

            <div className="mb-6 rounded-lg bg-purple-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-purple-300">Mint Cost:</span>
                <span className="font-semibold text-white">
                  {(
                    Number(writerCoin.mintCost) /
                    10 ** writerCoin.decimals
                  ).toFixed(0)}{" "}
                  {writerCoin.symbol}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <PaymentButton
                writerCoin={writerCoin}
                action="mint-nft"
                gameId={game.id}
                onPaymentSuccess={(txHash, storyIpId) => {
                  handleMintSuccess(txHash, storyIpId)
                }}
                onPaymentError={() => setShowMintDialog(false)}
                disabled={isMinting}
              />
            </div>

            <button
              onClick={() => setShowMintDialog(false)}
              disabled={isMinting}
              className="w-full rounded-lg border border-purple-500/50 px-4 py-2 font-medium text-purple-300 transition-colors hover:border-purple-400 hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {showSuccessDialog && mintResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-green-900/95 p-6 shadow-2xl border border-green-500/50">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h3 className="mb-2 text-xl font-bold text-center text-white">Minting Complete!</h3>
            <p className="mb-6 text-center text-green-100">
              Your game has been permanently recorded.
            </p>

            <div className="space-y-3 mb-6">
              <a
                href={`https://sepolia.basescan.org/tx/${mintResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors group"
              >
                <span className="flex items-center gap-2 text-white">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Base Network (NFT)
                </span>
                <span className="text-xs text-green-300 group-hover:text-green-200">View ↗</span>
              </a>

              {/* Story Protocol Opt-In */}
              {mintResult.storyIpId ? (
                <a
                  href={`https://aeneid-testnet-explorer.story.foundation/ipa/${mintResult.storyIpId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors group"
                >
                  <span className="flex items-center gap-2 text-white">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    Story Protocol (IP)
                  </span>
                  <span className="text-xs text-green-300 group-hover:text-green-200">View ↗</span>
                </a>
              ) : (
                <div className="p-4 rounded-lg bg-purple-900/40 border border-purple-500/30">
                  <h4 className="text-sm font-semibold text-purple-200 mb-2">Maximize Your Value</h4>
                  <p className="text-xs text-purple-300 mb-3">
                    Register your game's IP rights on Story Protocol to earn royalties from any future remixes.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        // Call the new opt-in endpoint
                        const response = await fetch('/api/story/register', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ gameId: game.id, userAddress: mintResult.txHash }) // Ideally pass address
                        });
                        const data = await response.json();
                        if (data.storyIPAssetId) {
                          setMintResult(prev => prev ? ({ ...prev, storyIpId: data.storyIPAssetId }) : null);
                        }
                      } catch (e) {
                        console.error("Registration failed", e);
                      }
                    }}
                    className="w-full py-2 rounded bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors"
                  >
                    Register IP Rights (Free)
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full rounded-lg bg-white/10 px-4 py-2 font-medium text-white transition-colors hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
