import React, {useContext, useState} from 'react';
import {GetNetworkShapeById} from '@/misc/networks';
import {EvmVaults} from '@/misc/vaults';
import EvmWalletConnectHelper from '@/components/EvmWalletConnectHelper';
import Input from '@/components/Input';
import EverWalletConnectHelper from '@/components/EverWalletConnectHelper';
import {GetTokenAssetByRoot} from '@/misc/token-assets';
import AmountInput from '@/components/AmountInput';
import EvmAllowanceHelper from '@/components/EvmAllowanceHelper';
import {BridgeStep, BridgeStepContext, TransferRoute, TransferType} from '@/providers/BridgeStepProvider';
import {useEvmEverscalePipeline} from '@/helpers/EvmEverscale/evmEverscalePipeline';
import {formatTokenValue, isGoodBignumber} from '@/utils';
import BigNumber from 'bignumber.js';

import './index.scss';

type Props = {
    sourceNetworkId: string;
    destinationNetworkId: 'everscale-1';
    vaultEvmAddress: string;
};

export default function PrepareEvmEverscaleDefault({
    sourceNetworkId,
    destinationNetworkId,
    vaultEvmAddress,
}: Props): JSX.Element {
    const {setStep: setBridgeStep} = useContext(BridgeStepContext);

    const sourceNetwork = GetNetworkShapeById(sourceNetworkId);
    const destinationNetwork = GetNetworkShapeById(destinationNetworkId);
    const vaultConfig = EvmVaults.find(
        (v) =>
            v.vaultEvmAddress === vaultEvmAddress &&
            v.chainId === GetNetworkShapeById(sourceNetworkId)?.chainId &&
            v.depositType === 'default',
    );
    const tip3TokenAsset = GetTokenAssetByRoot(vaultConfig?.tip3RootAddress || 'wrong');

    const [amountToTransfer, setAmountToTransfer] = useState<string>('0');

    if (sourceNetwork?.type !== 'evm' || destinationNetwork?.id !== 'everscale-1' || !tip3TokenAsset || !vaultConfig) {
        setBridgeStep({
            step: BridgeStep.Select,
        });
        return <div>Bad params</div>;
    }
    const pipeline = useEvmEverscalePipeline(sourceNetwork, destinationNetwork, vaultConfig);

    const {error: amountValidationError} = pipeline.isLoaded
        ? pipeline.checkLimitsForAmount(amountToTransfer)
        : {error: ''};

    return (
        <div className={'page-centered-parent-container'}>
            <div className={'prepare-transfer-page-container'}>
                <div className={'prepare-transfer-layout'}>
                    <div className={'prepare-transfer-input-data'}>
                        <div className={'prepare-transfer-page-group-container'}>
                            <Input
                                label={'Sender address:'}
                                value={pipeline.isLoaded ? pipeline.sourceAccount : 'Please connect metamask'}
                                onChange={() => null}
                                readonly={true}
                            />
                            <div className={'margin-top-bottom-10'}>
                                <EvmWalletConnectHelper network={sourceNetwork} />
                            </div>
                        </div>
                        <div className={'prepare-transfer-page-group-container'}>
                            <Input
                                label={'Receiver address:'}
                                value={pipeline.isLoaded ? pipeline.destinationAccount : 'Please connect EverWallet'}
                                onChange={() => null}
                                readonly={true}
                            />
                            <div className={'margin-top-bottom-10'}>
                                <EverWalletConnectHelper />
                            </div>
                        </div>
                        <div className={'prepare-transfer-page-group-container'}>
                            <AmountInput
                                label={'Amount:'}
                                decimals={
                                    pipeline.isLoaded ? Math.min(pipeline.erc20Decimals, pipeline.tip3Decimals) : 0
                                }
                                value={amountToTransfer || 'Enter an amount'}
                                onChange={(newValue) => setAmountToTransfer(newValue)}
                                readonly={false}
                            />
                        </div>
                        <div className={'prepare-transfer-page-group-container'}>
                            {pipeline.isLoaded && isGoodBignumber(amountToTransfer) ? (
                                pipeline.error || amountValidationError ? (
                                    <div className={'prepare-transfer-page-error'}>
                                        {pipeline.error || amountValidationError}
                                    </div>
                                ) : pipeline.checkIsAllowanceEnough(amountToTransfer) ? (
                                    <div
                                        onClick={() => {
                                            setBridgeStep({
                                                step: BridgeStep.Transfer,
                                                route: TransferRoute.EvmEverscale,
                                                type: TransferType.Default,
                                                sourceNetworkId: sourceNetworkId,
                                                destinationNetworkId: destinationNetworkId,
                                                amount: new BigNumber(amountToTransfer)
                                                    .shiftedBy(pipeline.erc20Decimals)
                                                    .dp(0, BigNumber.ROUND_DOWN),
                                                vaultEvmAddress: vaultEvmAddress,
                                                destinationAddress: pipeline.destinationAccount,
                                            });
                                        }}
                                        className={'material-like-button'}>
                                        Next
                                    </div>
                                ) : (
                                    <EvmAllowanceHelper
                                        forAddress={vaultConfig.vaultEvmAddress}
                                        requestApprove={pipeline.erc20RequestApprove}
                                        transactionType={sourceNetwork.transactionType || '0x0'}
                                        amount={new BigNumber(amountToTransfer)
                                            .shiftedBy(pipeline.erc20Decimals)
                                            .dp(0, BigNumber.ROUND_DOWN)}
                                    />
                                )
                            ) : (
                                <div className={'material-like-button disabled'}>Next</div>
                            )}
                        </div>
                    </div>
                    <div className={'prepare-transfer-vault-data'}>
                        <h4 className={'prepare-transfer-vault-data-title'}>Summary</h4>
                        <div className={'prepare-transfer-vault-data-info-line'}>
                            Token: <b className={'float-right'}>${tip3TokenAsset.symbol}</b>
                        </div>
                        <div className={'prepare-transfer-vault-data-info-line'}>
                            Source network:
                            <b className={'float-right'}>{sourceNetwork.name}</b>
                        </div>
                        <div className={'prepare-transfer-vault-data-info-line'}>
                            Source token decimals:
                            <b className={'float-right'}>{pipeline.isLoaded ? pipeline.erc20Decimals : ''}</b>
                        </div>
                        <div className={'prepare-transfer-vault-data-info-line'}>
                            Target network:
                            <b className={'float-right'}>{destinationNetwork.name}</b>
                        </div>
                        <div className={'prepare-transfer-vault-data-info-line'}>
                            Target token decimals:
                            <b className={'float-right'}>{pipeline.isLoaded ? pipeline.tip3Decimals : ''}</b>
                        </div>
                        <div className={'prepare-transfer-vault-data-info-line'}>
                            Vault balance:
                            <b className={'float-right'}>
                                {pipeline.isLoaded
                                    ? formatTokenValue(pipeline.vaultBalance, pipeline.erc20Decimals)
                                    : ''}
                            </b>
                        </div>
                        <div className={'prepare-transfer-vault-data-info-line'}>
                            Available deposit:
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
