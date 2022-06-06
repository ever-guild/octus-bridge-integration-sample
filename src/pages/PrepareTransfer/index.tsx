import React, {useContext} from 'react';
import {BridgeStep, BridgeStepContext, TransferRoute, TransferType} from '@/providers/BridgeStepProvider';

import './index.scss';
import PrepareEvmEverscaleDefault from './PrepareEvmEverscaleDefault';
import PrepareEvmEverscaleCredit from './PrepareEvmEverscaleCredit';
import PrepareEverscaleEvm from "@/pages/PrepareTransfer/PrepareEverscaleEvm";

// Just select scenario and then select token to transfer

export default function Page(): JSX.Element {
    const {state} = useContext(BridgeStepContext);

    if (state.step !== BridgeStep.Prepare) {
        return <div>Unreachable</div>;
    }

    return (() => {
        switch (state.route) {
            case TransferRoute.EvmEverscale:
                if (state.type === TransferType.Default) {
                    return (
                        <PrepareEvmEverscaleDefault
                            sourceNetworkId={state.sourceNetworkId}
                            destinationNetworkId={state.destinationNetworkId}
                            vaultEvmAddress={state.vaultEvmAddress}
                        />
                    );
                } else {
                    return (
                        <PrepareEvmEverscaleCredit
                            sourceNetworkId={state.sourceNetworkId}
                            destinationNetworkId={state.destinationNetworkId}
                            vaultEvmAddress={state.vaultEvmAddress}
                        />
                    );
                }
            case TransferRoute.EverscaleEvm:
                return <PrepareEverscaleEvm sourceNetworkId={state.sourceNetworkId}
                                            destinationNetworkId={state.destinationNetworkId}
                                            vaultEvmAddress={state.vaultEvmAddress} />
            default:
                return (
                    <div className={'page-centered-parent-container'}>
                        <div className={'prepare-transfer-page-container'}>Not realized by now.</div>
                    </div>
                );
        }
    })();
}
