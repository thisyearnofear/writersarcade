// Stub for baseAccount connector that we're not using
// This avoids the ox import compatibility issue
export function baseAccount() {
  throw new Error('baseAccount connector is not available in this build');
}

export default baseAccount;
