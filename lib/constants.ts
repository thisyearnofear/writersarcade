export const ADMIN_WALLETS = [
    '0xB39c7E677F67138332152F9423984E3473f32D56', // Main Admin
    '0x55A5705453Ee82c742274154136Fce8149597058', // User-requested admin
    // Add other admin wallets here
].map(w => w.toLowerCase())

export const isAdmin = (wallet?: string | null) => {
    if (!wallet) return false
    return ADMIN_WALLETS.includes(wallet.toLowerCase())
}
