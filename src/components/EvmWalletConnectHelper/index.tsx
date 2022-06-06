import React from 'react';

import './index.css';
import {EvmWalletConnectionStatus, NetworkShape} from '@/types';
import {useEvmWallet} from '@/providers/EvmWalletProvider';

type ComponentProps = {
    network: NetworkShape;
};

export default function EvmWalletConnectHelper(props: ComponentProps): JSX.Element {
    const {network} = props;
    const {getMetamaskConnectionStatusForChainId, activatingConnector, activateConnector, changeNetwork} =
        useEvmWallet();

    return (
        <div className={'evm-wallet-connect-helper-container'}>
            {(() => {
                switch (getMetamaskConnectionStatusForChainId(network.chainId)) {
                    case EvmWalletConnectionStatus.NotInstalled:
                        return (
                            <a
                                target={'_blank'}
                                className={'evm-wallet-connect-helper-button'}
                                href={
                                    'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn'
                                }
                                rel="noreferrer">
                                Install metamask
                            </a>
                        );
                    case EvmWalletConnectionStatus.HasWrongNetwork:
                        return (
                            <button
                                className={'evm-wallet-connect-helper-button'}
                                onClick={() => {
                                    changeNetwork(network);
                                }}>
                                Change network
                            </button>
                        );
                    case EvmWalletConnectionStatus.NotConnected:
                        return (
                            <button
                                className={'evm-wallet-connect-helper-button'}
                                onClick={() => !activatingConnector && activateConnector()}>
                                Connect metamask
                            </button>
                        );
                    default:
                        return <React.Fragment />;
                }
            })()}
        </div>
    );
}
