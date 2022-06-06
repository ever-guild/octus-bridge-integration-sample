import React, {useContext} from 'react';
import {BridgeStep, BridgeStepContext, TransferRoute, TransferType} from '@/providers/BridgeStepProvider';
import TransferEvmEverscaleDefault from './TransferEvmEverscaleDefault';

import {useHistory} from 'react-router-dom';
import TransferEvmEverscaleCredit from '@/pages/Transfer/TransferEvmEverscaleCredit';
import TransferEverscaleEvmDefault from '@/pages/Transfer/TransferEverscaleEvmDefault';

import './index.scss';

// Just select scenario and then select token to transfer

export default function Page(): JSX.Element {
    const history = useHistory();
    const {state, setStep} = useContext(BridgeStepContext);

    if (state.step !== BridgeStep.Transfer) {
        return <div>Unreachable</div>;
    }

    return (() => {
        switch (state.route) {
            case TransferRoute.EvmEverscale:
                if (state.type === TransferType.Default) {
                    return (
                        <TransferEvmEverscaleDefault
                            sourceNetworkId={state.sourceNetworkId}
                            destinationNetworkId={state.destinationNetworkId}
                            amount={state.amount}
                            destinationAddress={state.destinationAddress}
                            vaultEvmAddress={state.vaultEvmAddress}
                            depositTxHash={state.depositTxHash}
                            onDepositTxHash={(hash: string) => {
                                history.push(
                                    `/transfer/${state.sourceNetworkId}/${state.destinationNetworkId}/${state.vaultEvmAddress}/${hash}/default`,
                                );
                                setStep({...state, depositTxHash: hash});
                            }}
                        />
                    );
                } else {
                    return (
                        <TransferEvmEverscaleCredit
                            sourceNetworkId={state.sourceNetworkId}
                            destinationNetworkId={state.destinationNetworkId}
                            amount={state.amount}
                            minEversAmount={state.minEversAmount}
                            minTokensAmount={state.minTokensAmount}
                            destinationAddress={state.destinationAddress}
                            vaultEvmAddress={state.vaultEvmAddress}
                            depositTxHash={state.depositTxHash}
                            onDepositTxHash={(hash: string) => {
                                history.push(
                                    `/transfer/${state.sourceNetworkId}/${state.destinationNetworkId}/${state.vaultEvmAddress}/${hash}/credit`,
                                );
                                setStep({...state, depositTxHash: hash});
                            }}
                        />
                    );
                }
            default:
                return (
                    <TransferEverscaleEvmDefault
                        sourceNetworkId={state.sourceNetworkId}
                        destinationNetworkId={state.destinationNetworkId}
                        amountTip3Decimals={state.amountTip3Decimals}
                        destinationAddress={state.destinationAddress}
                        vaultEvmAddress={state.vaultEvmAddress}
                        eventAddress={state.eventAddress}
                        releaseTxHash={state.releaseTxHash}
                        onReleaseTxHash={(hash: string) => {
                            history.push(
                                `/transfer/${state.sourceNetworkId}/${state.destinationNetworkId}/${state.vaultEvmAddress}/${state.eventAddress}/${hash}`,
                            );
                            setStep({...state, releaseTxHash: hash});
                        }}
                        onEventAddress={(address: string) => {
                            history.push(
                                `/transfer/${state.sourceNetworkId}/${state.destinationNetworkId}/${state.vaultEvmAddress}/${address}`,
                            );
                            setStep({...state, eventAddress: address});
                        }}
                    />
                );
        }
    })();
}
