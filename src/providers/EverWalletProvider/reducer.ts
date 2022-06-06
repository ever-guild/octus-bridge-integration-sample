import {Permissions} from 'everscale-inpage-provider';

export type Account = Permissions['accountInteraction'];

export type EverWalletStateType = {
    account?: Account;
    hasProvider: boolean;
    isConnecting: boolean;
    isInitialized: boolean;
    isInitializing: boolean;
};

export enum EverWalletActionTypes {
    InitializingFailedNoProvider = 0,
    SetInitStatus,
    SetAccount,
}

interface InitializingFailedNoProviderAction {
    type: EverWalletActionTypes.InitializingFailedNoProvider;
}

interface SetInitStatusAction {
    type: EverWalletActionTypes.SetInitStatus;
    payload: {
        hasProvider?: boolean;
        isConnecting?: boolean;
        isInitialized?: boolean;
        isInitializing?: boolean;
    };
}

interface SetAccount {
    type: EverWalletActionTypes.SetAccount;
    payload: Account | undefined;
}

export type EverWalletActions = InitializingFailedNoProviderAction | SetInitStatusAction | SetAccount;

export const EverWalletReducer = (state: EverWalletStateType, action: EverWalletActions): EverWalletStateType => {
    switch (action.type) {
        case EverWalletActionTypes.InitializingFailedNoProvider:
            return {
                hasProvider: false,
                isConnecting: false,
                isInitialized: false,
                isInitializing: false,
            };
        case EverWalletActionTypes.SetInitStatus:
            return {
                ...state,
                ...action.payload,
            };
        case EverWalletActionTypes.SetAccount:
            return {
                ...state,
                hasProvider: true,
                isConnecting: false,
                isInitialized: true,
                isInitializing: false,
                account: action.payload,
            };

        default:
            return state;
    }
};
