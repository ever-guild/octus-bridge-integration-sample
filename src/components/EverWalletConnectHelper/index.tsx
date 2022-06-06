import React from 'react';

import './index.css';
import {EverWalletConnectionStatus} from '@/types';
import {useEverWallet} from '@/providers/EverWalletProvider';

export default function EverWalletConnectHelper(): JSX.Element {
    const {connect, connectionStatus} = useEverWallet();
    return (
        <div className={'evm-wallet-connect-helper-container'}>
            {(() => {
                switch (connectionStatus) {
                    case EverWalletConnectionStatus.NotInstalled:
                        return (
                            <a
                                target={'_blank'}
                                className={'evm-wallet-connect-helper-button'}
                                href={
                                    'https://chrome.google.com/webstore/detail/ever-wallet/cgeeodpfagjceefieflmdfphplkenlfk'
                                }
                                rel="noreferrer">
                                Install EverWallet
                            </a>
                        );
                    case EverWalletConnectionStatus.NotConnected:
                        return (
                            <button className={'evm-wallet-connect-helper-button'} onClick={connect}>
                                Connect EverWallet
                            </button>
                        );
                    default:
                        return <React.Fragment />;
                }
            })()}
        </div>
    );
}
