import React, {useContext, useEffect} from 'react';
import SelectNetworkAndAsset from './pages/SelectNetworkAndAsset';
import {BridgeStep, BridgeStepContext, TransferRoute, TransferType} from '@/providers/BridgeStepProvider';
import PrepareTransfer from './pages/PrepareTransfer';
import Transfer from './pages/Transfer';
import {useParams} from 'react-router-dom';
import {GetNetworkShapeById} from '@/misc/networks';

export type TransferParams = {
    transferType: string;
    fromNetworkId: string;
    toNetworkId: string;
    vaultAddress: string;
    depositTxHashOrEventAddress: string;
    transferTypeOrReleaseTxHash?: string;
};

function Bridge() {
    const {
        state: {step},
        setStep,
    } = useContext(BridgeStepContext);

    const params = useParams<TransferParams>();

    // There we check if we used router /transfer/:fromNetworkId/:toNetworkId/:depositTxHashOrEventAddress/:transferTypeOrReleaseTxHash?
    // To continue transfer
    useEffect(function () {
        const sourceNetwork = GetNetworkShapeById(params.fromNetworkId);
        const destinationNetwork = GetNetworkShapeById(params.toNetworkId);

        if (sourceNetwork && destinationNetwork && params.depositTxHashOrEventAddress) {
            if (
                sourceNetwork.type === 'evm' &&
                destinationNetwork.type === 'everscale' &&
                params.toNetworkId === 'everscale-1' &&
                params.vaultAddress &&
                (TransferType.Default === params.transferTypeOrReleaseTxHash ||
                    TransferType.Credit === params.transferTypeOrReleaseTxHash)
            ) {
                setStep({
                    step: BridgeStep.Transfer,
                    route: TransferRoute.EvmEverscale,
                    type: params.transferTypeOrReleaseTxHash,
                    vaultEvmAddress: params.vaultAddress,
                    sourceNetworkId: params.fromNetworkId,
                    destinationNetworkId: params.toNetworkId,
                    depositTxHash: params.depositTxHashOrEventAddress,
                });
            } else if (
                sourceNetwork.type === 'everscale' &&
                destinationNetwork.type === 'evm' &&
                params.fromNetworkId === 'everscale-1' &&
                params.vaultAddress
            ) {
                setStep({
                    step: BridgeStep.Transfer,
                    route: TransferRoute.EverscaleEvm,
                    type: TransferType.Default,
                    vaultEvmAddress: params.vaultAddress,
                    sourceNetworkId: params.fromNetworkId,
                    destinationNetworkId: params.toNetworkId,
                    eventAddress: params.depositTxHashOrEventAddress,
                    releaseTxHash: params.transferTypeOrReleaseTxHash,
                });
            }
        }
    }, []);

    switch (step) {
        case BridgeStep.Select:
            return <SelectNetworkAndAsset />;
        case BridgeStep.Prepare:
            return <PrepareTransfer />;
        case BridgeStep.Transfer:
            return <Transfer />;
        default:
            return <div>Not realized by now;</div>;
    }
}

export default Bridge;
