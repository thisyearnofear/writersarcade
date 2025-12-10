import { NextRequest, NextResponse } from 'next/server'
import { registerAssetAsIP, AssetRegistrationInput } from '@/lib/story-protocol.service'
import { uploadToIPFS, computeMetadataHash } from '@/lib/ipfs-utils'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { optionalAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const user = await optionalAuth()

        // In strict hackathon mode, we might not always have full auth, 
        // but ideally we need a creator address.
        // Ensure you have a wallet address either from user session or passed in body (for dev)
        const body = await request.json()
        const { assetId, assetData } = body

        let targetAsset = assetData

        // 1. If assetId provided, fetch from DB
        if (assetId) {
            const dbAsset = await GameDatabaseService.getAssetPack(assetId)
            if (!dbAsset) throw new Error("Asset not found in DB")
            targetAsset = dbAsset
        }

        if (!targetAsset) throw new Error("No asset data provided")

        // 2. Prepare Metadata for IPFS
        // We upload TWO things:
        // A. The "IP Metadata" (Story Protocol standard fields)
        // B. The "NFT Metadata" (OpenSea standard fields)

        // IP Metadata (The Story)
        const ipMetadata = {
            title: targetAsset.title,
            description: targetAsset.description,
            attributes: [
                { key: "Type", value: targetAsset.type || "Asset Pack" },
                { key: "Genre", value: targetAsset.genre || "General" },
                { key: "ArticleURL", value: targetAsset.articleUrl || "" }
            ]
        }

        // NFT Metadata (The Visual)
        const nftMetadata = {
            name: targetAsset.title,
            description: targetAsset.description,
            attributes: [
                { trait_type: "Type", value: targetAsset.type || "Asset Pack" }
            ]
            // image: ... (We could add a generated image here later)
        }

        console.log("Uploading metadata to IPFS...")
        // In prod, these would be parallel
        const ipMetadataUri = await uploadToIPFS(ipMetadata)
        const nftMetadataUri = await uploadToIPFS(nftMetadata)

        // Hash content for integrity
        const contentHash = computeMetadataHash(targetAsset.content)

        // 3. Register on Story Protocol
        const registrationInput: AssetRegistrationInput = {
            title: targetAsset.title,
            description: targetAsset.description,
            type: targetAsset.type || 'pack',
            contentHash,
            creators: [], // Add creator attribution if available
            ipMetadataUri,
            nftMetadataUri
        }

        const result = await registerAssetAsIP(registrationInput)

        return NextResponse.json({
            success: true,
            data: result
        })

    } catch (error) {
        console.error('Asset Registration Failed:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Registration failed'
        }, { status: 500 })
    }
}
