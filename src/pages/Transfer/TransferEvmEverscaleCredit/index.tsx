import React, {useContext} from 'react';
import {GetNetworkShapeById} from '@/misc/networks';
import {EvmVaults} from '@/misc/vaults';
import {GetTokenAssetByRoot} from '@/misc/token-assets';
import {formatTokenValue} from '@/utils';
import {BridgeStep, BridgeStepContext, TransferType} from '@/providers/BridgeStepProvider';
import {useEvmEverscalePipeline} from '@/helpers/EvmEverscale/evmEverscalePipeline';

import './index.scss';
import BigNumber from 'bignumber.js';
import {useEvmDepositToFactoryHelper} from '@/helpers/EvmEverscale/EvmDepositToFactoryHelper';
import {
    Status,
    useEverscaleCreditProcessorStatusHelper,
} from '@/helpers/EvmEverscale/EverscaleCreditProcessorStatusHelper';
import {useHistory} from 'react-router-dom';

type Props = {
    // If we have depositTxHash we don't need amount and destinationAddress, we will get it from deposit tx
    sourceNetworkId: string;
    destinationNetworkId: 'everscale-1';
    vaultEvmAddress: string;
    amount?: BigNumber;
    minEversAmount?: BigNumber;
    minTokensAmount?: BigNumber;
    destinationAddress?: string;
    depositTxHash?: string;
    onDepositTxHash: (txHash: string) => void;
};

export default function TransferEvmEverscaleCredit(props: Props): JSX.Element {
    const {setStep: setBridgeStep} = useContext(BridgeStepContext);
    const history = useHistory();

    const sourceNetwork = GetNetworkShapeById(props.sourceNetworkId);
    const destinationNetwork = GetNetworkShapeById(props.destinationNetworkId);
    const vaultConfig = EvmVaults.find(
        (v) =>
            v.vaultEvmAddress === props.vaultEvmAddress &&
            v.chainId === sourceNetwork?.chainId &&
            v.depositType === 'credit',
    );
    const tip3TokenAsset = GetTokenAssetByRoot(vaultConfig?.tip3RootAddress || 'wrong');

    if (sourceNetwork?.type !== 'evm' || destinationNetwork?.id !== 'everscale-1' || !tip3TokenAsset || !vaultConfig) {
        setBridgeStep({
            step: BridgeStep.Select,
        });
        return <div>Bad params</div>;
    }

    const pipeline = useEvmEverscalePipeline(sourceNetwork, destinationNetwork, vaultConfig);

    const {component: EvmDepositToFactoryHelperComponent, depositEvent} = useEvmDepositToFactoryHelper({
        amount: props.amount,
        minEversAmount: props.minEversAmount,
        minTokensAmount: props.minTokensAmount,
        transferType: TransferType.Credit,
        pipeline: pipeline,
        network: sourceNetwork,
        destinationAddress: props.destinationAddress,
        onTransactionHash: props.onDepositTxHash,
        transactionHash: props.depositTxHash,
    });

    const {status: ReleaseStatus, component: EverscaleCreditProcessorStatusComponent} =
        useEverscaleCreditProcessorStatusHelper({
            pipeline: pipeline,
            txHash: props.depositTxHash,
            sourceNetworkId: sourceNetwork.id,
            depositEventData: depositEvent,
        });

    return (
        <div className={'page-centered-parent-container'}>
            <div className={'transfer-ever-everscale-default-page-container'}>
                <div className={'transfer-ever-everscale-default-page-layout'}>
                    <div>
                        <div className={'transfer-ever-everscale-default-page-group-container'}>
                            <h3>Transfer steps:</h3>
                        </div>
                        <div className={'transfer-ever-everscale-default-page-group-container'}>
                            <h4>1. Deposit: </h4>
                            {EvmDepositToFactoryHelperComponent}
                        </div>
                        <div className={'transfer-ever-everscale-default-page-group-container'}>
                            <h4>2. Release: </h4>
                            {EverscaleCreditProcessorStatusComponent}
                            {ReleaseStatus === Status.Finished && (
                                <div
                                    className={'material-like-button margin-top-bottom-10'}
                                    onClick={() => {
                                        history.push('/');
                                        setBridgeStep({
                                            step: BridgeStep.Select,
                                        });
                                    }}>
                                    Home
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={'transfer-ever-everscale-default-summary'}>
                        <h4 className={'transfer-ever-everscale-default-summary-title'}>Summary</h4>
                        <div className={'transfer-ever-everscale-default-summary-info-line'}>
                            Token: <b className={'float-right'}>${tip3TokenAsset.symbol}</b>
                        </div>
                        <div className={'transfer-ever-everscale-default-summary-info-line'}>
                            From:
                            <b className={'float-right'}>
                                {sourceNetwork.name} {}
                            </b>
                        </div>
                        <div className={'transfer-ever-everscale-default-summary-info-line'}>
                            Target network:
                            <b className={'float-right'}>{destinationNetwork.name}</b>
                        </div>
                        <div className={'transfer-ever-everscale-default-summary-info-line'}>
                            Vault available deposit:
                            <b className={'float-right'}>
                                {pipeline.isLoaded
                                    ? formatTokenValue(pipeline.vaultAvailableDeposit, pipeline.erc20Decimals)
                                    : ''}
                            </b>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
