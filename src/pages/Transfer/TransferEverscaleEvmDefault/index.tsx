import React, {useContext} from 'react';
import {GetNetworkShapeById} from '@/misc/networks';
import {EvmVaults} from '@/misc/vaults';
import {GetTokenAssetByRoot} from '@/misc/token-assets';
import {formatTokenValue} from '@/utils';
import {BridgeStep, BridgeStepContext, TransferType} from '@/providers/BridgeStepProvider';

import './index.scss';
import BigNumber from 'bignumber.js';
import {useHistory} from 'react-router-dom';
import {useEverscaleEvmPipeline} from '@/helpers/EverscaleEvm/everscaleEvmPipeline';
import {useEverscaleDepositHelper} from '@/helpers/EverscaleEvm/EverscaleDepositHelper';
import {Status as EvmReleaseStatus, useEvmReleaseTransferHelper} from '@/helpers/EverscaleEvm/EvmReleaseTransferHelper';
import {EverscaleEventCloseHelper} from '@/helpers/EverscaleEvm/EverscaleEventCloseHelper';

type Props = {
    // If we have depositTxHash we don't need amount and destinationAddress, we will get it from deposit tx
    sourceNetworkId: 'everscale-1';
    destinationNetworkId: string;
    vaultEvmAddress: string;

    // we need (amountTip3Decimals and destinationAddress) or eventAddress
    amountTip3Decimals?: BigNumber;
    destinationAddress?: string;
    eventAddress?: string;
    releaseTxHash?: string;

    onReleaseTxHash: (hash: string) => void;
    onEventAddress: (address: string) => void;
};

export default function TransferEverscaleEvmDefault(props: Props): JSX.Element {
    const {setStep: setBridgeStep} = useContext(BridgeStepContext);
    const history = useHistory();

    const sourceNetwork = GetNetworkShapeById(props.sourceNetworkId);
    const destinationNetwork = GetNetworkShapeById(props.destinationNetworkId);
    const vaultConfig = EvmVaults.find(
        (v) =>
            v.vaultEvmAddress === props.vaultEvmAddress &&
            v.chainId === destinationNetwork?.chainId &&
            v.depositType === 'default',
    );
    const tip3TokenAsset = GetTokenAssetByRoot(vaultConfig?.tip3RootAddress || 'wrong');

    if (sourceNetwork?.id !== 'everscale-1' || destinationNetwork?.type !== 'evm' || !tip3TokenAsset || !vaultConfig) {
        return <div>Bad params</div>;
    }

    const pipeline = useEverscaleEvmPipeline(sourceNetwork, destinationNetwork, vaultConfig);

    const {
        component: EverscaleDepositHelperComponent,
        rawSignatures,
        depositEventData,
    } = useEverscaleDepositHelper({
        amount: props.amountTip3Decimals,
        transferType: TransferType.Default,
        pipeline: pipeline,
        destinationNetwork: destinationNetwork,
        destinationAddress: props.destinationAddress,
        onEventAddress: props.onEventAddress,
        eventAddress: props.eventAddress,
    });

    const {status: ReleaseStatus, component: EverscaleReleaseTransferHelperComponent} = useEvmReleaseTransferHelper({
        pipeline,
        depositEventData,
        rawSignatures,
        releaseTxHash: props.releaseTxHash,
        onReleaseTxHash: props.onReleaseTxHash,
        destinationNetworkId: props.destinationNetworkId,
        depositEventAddress: props.eventAddress,
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
                            {EverscaleDepositHelperComponent}
                        </div>
                        <div className={'transfer-ever-everscale-default-page-group-container'}>
                            <h4>2. Release: </h4>
                            {EverscaleReleaseTransferHelperComponent}
                            {ReleaseStatus === EvmReleaseStatus.Finished && (
                                <EverscaleEventCloseHelper eventAddress={props.eventAddress!} />
                            )}
                            {ReleaseStatus === EvmReleaseStatus.Finished && (
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
                            Vault balance:
                            <b className={'float-right'}>
                                {pipeline.isLoaded
                                    ? formatTokenValue(pipeline.vaultBalance, pipeline.erc20Decimals)
                                    : ''}
                            </b>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
