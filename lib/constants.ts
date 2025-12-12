export const ADMIN_WALLETS = [
    '0xB39c7E677F67138332152F9423984E3473f32D56', // Main Admin
    // Add other admin wallets here
].map(w => w.toLowerCase())

export const isAdmin = (wallet?: string | null) => {
    if (!wallet) return false
    return ADMIN_WALLETS.includes(wallet.toLowerCase())
}
