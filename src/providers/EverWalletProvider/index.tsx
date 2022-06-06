import {AddressLiteral, hasEverscaleProvider, ProviderRpcClient} from 'everscale-inpage-provider';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useReducer} from 'react';
import {Account, EverWalletActionTypes, EverWalletReducer} from './reducer';
import BigNumber from 'bignumber.js';
import {EverWalletConnectionStatus} from '@/types';

export const rpc = new ProviderRpcClient();

export const DexRootAddress = new AddressLiteral('0:5eb5713ea9b4a0f3a13bc91b282cde809636eb1e68d2fcb6427b9ad78a5a9008');
export const WEVERRootAddress = new AddressLiteral(
    '0:a49cd4e158a9a15555e624759e2e4e766d22600b7800d891e46f9291f044a93d',
);
export const CreditBody = new BigNumber(5800000000);
export const WEverCoinDecimals = 9;
export const CreditFactoryAddress = new AddressLiteral(
    '0:5ae128e08b2c17428629e092c1a7bd5c77a83a27fa3b833a31c2eb3d704d7f68',
);

export const DefaultNumerator = '1';
export const MaximumNumerator = '10';
export const DefaultDenominator = '100';

const initialState = {
    account: undefined,
    hasProvider: false,
    isConnecting: false,
    isInitialized: false,
    isInitializing: true,
    connect: () => null,
};

export type EverWalletProviderType = {
    account?: Account;
    hasProvider: boolean;
    isConnecting: boolean;
    isInitialized: boolean;
    isInitializing: boolean;
    connect: () => void;
};

const EverWalletContext = createContext<EverWalletProviderType>(initialState);

export interface EverWalletProviderProps {
    children: React.ReactNode;
}

function useEverWalletManager(): EverWalletProviderType {
    const [state, dispatch] = useReducer(EverWalletReducer, initialState);

    useEffect(() => {
        const initPipeline = async () => {
            const hasProvider = await hasEverscaleProvider();
            if (!hasProvider) {
                dispatch({
                    type: EverWalletActionTypes.InitializingFailedNoProvider,
                });
                return;
            }

            await rpc.ensureInitialized();

            dispatch({
                type: EverWalletActionTypes.SetInitStatus,
                payload: {
                    hasProvider: true,
                    isConnecting: true,
                    isInitialized: false,
                    isInitializing: true,
                },
            });

            const permissionsSubscriber = await rpc.subscribe('permissionsChanged');
            permissionsSubscriber.on('data', (event) => {
                dispatch({
                    type: EverWalletActionTypes.SetAccount,
                    payload: event.permissions.accountInteraction,
                });
            });

            const currentProviderState = await rpc.getProviderState();
            if (currentProviderState.permissions.accountInteraction === undefined) {
                dispatch({
                    type: EverWalletActionTypes.SetInitStatus,
                    payload: {
                        isInitialized: true,
                        isInitializing: false,
                        isConnecting: false,
                    },
                });
                return;
            }

            //connect to wallet
            try {
                await rpc.requestPermissions({
                    permissions: ['basic', 'accountInteraction'],
                });
            } catch (e) {
                dispatch({
                    type: EverWalletActionTypes.SetInitStatus,
                    payload: {
                        isInitialized: true,
                        isInitializing: false,
                        isConnecting: false,
                    },
                });
            }
        };

        initPipeline().catch((err) => {
            console.log(`Ever wallet init error`, err);
        });
    }, []);

    const connect = useCallback(async () => {
        const hasProvider = await hasEverscaleProvider();
        if (hasProvider && !state.isConnecting) {
            await rpc.ensureInitialized();
            await rpc.requestPermissions({
                permissions: ['basic', 'accountInteraction'],
            });
        }
    }, [state.isConnecting]);

    return {
        account: state.account,
        connect,
        hasProvider: state.hasProvider,
        isConnecting: state.isConnecting,
        isInitialized: state.isInitialized,
        isInitializing: state.isInitializing,
    };
}

export const EverWalletProvider: React.FunctionComponent<EverWalletProviderProps> = ({children}) => {
    const {account, connect, hasProvider, isConnecting, isInitialized, isInitializing} = useEverWalletManager();
    return (
        <EverWalletContext.Provider
            value={{account, connect, hasProvider, isConnecting, isInitialized, isInitializing}}>
            {children}
        </EverWalletContext.Provider>
    );
};

export function useEverWallet() {
    const {account, connect, hasProvider, isInitialized, isInitializing} = useContext(EverWalletContext);

    const connectionStatus: EverWalletConnectionStatus = useMemo(
        function () {
            if (isInitializing) {
                return EverWalletConnectionStatus.Initializing;
            } else if (!hasProvider) {
                return EverWalletConnectionStatus.NotInstalled;
            } else if (isInitialized && !account) {
                return EverWalletConnectionStatus.NotConnected;
            } else {
                return EverWalletConnectionStatus.Ok;
            }
        },
        [hasProvider, isInitialized, isInitializing, account],
    );

    return {account, connect, connectionStatus};
}
