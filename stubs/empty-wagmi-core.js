// Empty stub for @wagmi/core to prevent build errors
export class BaseError extends Error {}
export class ChainNotConfiguredError extends Error {}
export class ConnectorAccountNotFoundError extends Error {}
export class ConnectorAlreadyConnectedError extends Error {}
export class ConnectorChainMismatchError extends Error {}
export class ProviderNotFoundError extends Error {}
export class ConnectorNotFoundError extends Error {}
export class ConnectorUnavailableReconnectingError extends Error {}
export class SwitchChainNotSupportedError extends Error {}
export class UserRejectedRequestError extends Error {}
export class ResourceNotFoundError extends Error {}
export class RpcError extends Error {}
export class TransactionExecutionError extends Error {}
export class UnknownNodeError extends Error {}
export class UnknownRpcError extends Error {}
export class UnsupportedChainIdError extends Error {}
export class UnsupportedOperationError extends Error {}
export class WaitForTransactionReceiptTimeoutError extends Error {}

// Essential wagmi functions and utilities
export const createConnector = () => {};
export const createConfig = () => {};
export const createStorage = () => {};
export const custom = () => {};
export const deepEqual = () => {};
export const deserialize = () => {};
export const fallback = () => {};
export const http = () => {};
export const noopStorage = () => {};
export const normalizeChainId = () => {};
export const parseCookie = () => {};
export const serialize = () => {};
export const unstable_connector = () => {};
export const webSocket = () => {};
export const extractRpcUrls = () => [];
export const injected = {};
export const mock = {};
export const cookieStorage = {};
export const cookieToInitialState = () => {};
export const watchAccount = () => {};
export const getAccount = () => {};
export const getChainId = () => {};
export const getConnections = () => {};
export const getClient = () => {};
export const reconnect = () => {};
export const switchChain = () => {};
export const disconnect = () => {};

// Export all the needed entities as empty placeholders
export * from 'viem';