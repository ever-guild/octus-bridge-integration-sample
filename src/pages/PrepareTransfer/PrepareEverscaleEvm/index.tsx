import React, {useContext, useState} from 'react';
import {GetNetworkShapeById} from '@/misc/networks';
import {EvmVaults, GetVaultByChainIdAndTokenRootAndDepositType} from '@/misc/vaults';
import EvmWalletConnectHelper from '@/components/EvmWalletConnectHelper';
import Input from '@/components/Input';
import EverWalletConnectHelper from '@/components/EverWalletConnectHelper';
import {GetTokenAssetByRoot} from '@/misc/token-assets';
import AmountInput from '@/components/AmountInput';
import {BridgeStep, BridgeStepContext, TransferRoute, TransferType} from '@/providers/BridgeStepProvider';
import {formatTokenValue, isGoodBignumber} from '@/utils';
import BigNumber from 'bignumber.js';
import {useEverscaleEvmPipeline} from '@/helpers/EverscaleEvm/everscaleEvmPipeline';

import './index.scss';

type Props = {
    sourceNetworkId: 'everscale-1';
    destinationNetworkId: string;
    vaultEvmAddress: string;
};

export default function PrepareEverscaleEvm({
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
            v.chainId === GetNetworkShapeById(destinationNetworkId)?.chainId &&
            v.depositType === 'default',
    );
    const tip3TokenAsset = GetTokenAssetByRoot(vaultConfig?.tip3RootAddress || 'wrong');

    const [amountToTransfer, setAmountToTransfer] = useState<string>('0');

    if (destinationNetwork?.type !== 'evm' || sourceNetwork?.id !== 'everscale-1' || !tip3TokenAsset || !vaultConfig) {
        setBridgeStep({
            step: BridgeStep.Select,
        });
        return <div>Bad params</div>;
    }
    const pipeline = useEverscaleEvmPipeline(sourceNetwork, destinationNetwork, vaultConfig);

    const amountValidationError =
        pipeline.isLoaded &&
        isGoodBignumber(amountToTransfer) &&
        new BigNumber(amountToTransfer).shiftedBy(pipeline.tip3Decimals).gt(pipeline.userTokenBalance)
            ? `Insufficient USDT balance. Maximum spend: ${pipeline.userTokenBalance
                  .shiftedBy(-pipeline.tip3Decimals)
                  .toFixed()} ${tip3TokenAsset.symbol}`
            : '';

    const amountWarning =
        pipeline.isLoaded &&
        isGoodBignumber(amountToTransfer) &&
        new BigNumber(amountToTransfer)
            .shiftedBy(pipeline.tip3Decimals)
            .gt(pipeline.vaultBalance.shiftedBy(pipeline.tip3Decimals - pipeline.erc20Decimals))
            ? `Current vault balance is ${pipeline.vaultBalance
                  .shiftedBy(-pipeline.erc20Decimals)
                  .toFixed(2)}, so your withdraw will be putted in the queue`
            : '';

    return (
        <div className={'page-centered-parent-container'}>
            <div className={'prepare-transfer-page-container'}>
                <div className={'prepare-transfer-layout'}>
                    <div className={'prepare-transfer-input-data'}>
                        <div className={'prepare-transfer-page-group-container'}>
                            <Input
                                label={'Sender address:'}
                                value={
                                    pipeline.sourceAccount
                                        ? pipeline.sourceAccount.toString()
                                        : 'Please connect EverWallet'
                                }
                                onChange={() => null}
                                readonly={true}
                            />
                            <div className={'margin-top-bottom-10'}>
                                <EverWalletConnectHelper />
                            </div>
                        </div>
                        <div className={'prepare-transfer-page-group-container'}>
                            <Input
                                label={'Receiver address:'}
                                value={
                                    pipeline.destinationAccount
                                        ? pipeline.destinationAccount
                                        : 'Please connect metamask'
                                }
                                onChange={() => null}
                                readonly={true}
                            />
                            <div className={'margin-top-bottom-10'}>
                                <EvmWalletConnectHelper network={destinationNetwork} />
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
                            {pipeline.isLoaded &&
                                isGoodBignumber(amountToTransfer) &&
                                (pipeline.error || amountValidationError || amountWarning) && (
                                    <div className={'prepare-transfer-page-error margin-top-bottom-10'}>
                                        {pipeline.error || amountValidationError || amountWarning}
                                    </div>
                                )}
                            {pipeline.isLoaded &&
                            isGoodBignumber(amountToTransfer) &&
                            !(pipeline.error || amountValidationError) ? (
                                <div
                                    onClick={() => {
                                        setBridgeStep({
                                            step: BridgeStep.Transfer,
                                            route: TransferRoute.EverscaleEvm,
                                            type: TransferType.Default,
                                            sourceNetworkId: sourceNetworkId,
                                            destinationNetworkId: destinationNetworkId,
                                            amountTip3Decimals: new BigNumber(amountToTransfer)
                                                .shiftedBy(pipeline.tip3Decimals)
                                                .dp(0, BigNumber.ROUND_DOWN),
                                            vaultEvmAddress: vaultEvmAddress,
                                            destinationAddress: pipeline.destinationAccount,
                                        });
                                    }}
                                    className={'material-like-button'}>
                                    Next
                                </div>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
