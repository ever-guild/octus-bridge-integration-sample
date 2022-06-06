import {Contract as EthContract} from 'web3-eth-contract';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {EvmWalletConnectionStatus} from '@/types';
import {EthAbi} from '@/misc/eth-abi';
import {useEvmWallet} from '@/providers/EvmWalletProvider';
import BigNumber from 'bignumber.js';
import {isGoodBignumber} from '@/utils';
import {useErc20TokenForAddress} from '@/providers/EvmWalletProvider/hooks/erc20';
import {mapTonCellIntoEthBytes} from 'eth-ton-abi-converter';

export const useVaultContract = function (
    vaultAddress: string | undefined,
    vaultChainId: string | undefined,
): EthContract | undefined {
    const {web3, getMetamaskConnectionStatusForChainId, chainId, active} = useEvmWallet();

    return useMemo(
        function (): EthContract | undefined {
            if (
                !web3 ||
                !active ||
                !vaultAddress ||
                !vaultChainId ||
                vaultChainId !== chainId ||
                getMetamaskConnectionStatusForChainId(vaultChainId.toString()) !== EvmWalletConnectionStatus.Ok
            ) {
                return undefined;
            } else {
                return new web3.eth.Contract(EthAbi.Vault, vaultAddress);
            }
        },
        [chainId, web3, active, vaultChainId, vaultAddress],
    );
};

export type VaultData = {
    isPaused: boolean;
    address: string;
    availableDeposit: BigNumber;
    depositFee: BigNumber;
    withdrawFee: BigNumber;
    balance: BigNumber;
    contract: EthContract;
    saveWithdraw: (encodedEvent: string, rawSignatures: string[], fromAddress: string, txType: string) => any;
};

export const useVaultContractWithData = function (
    vaultAddress: string,
    vaultChainId: string,
    expectedErc20Address: string,
): VaultData | undefined {
    const {web3} = useEvmWallet();
    const vaultContract: EthContract | undefined = useVaultContract(vaultAddress, vaultChainId);

    const [availableDeposit, setAvailableDeposit] = useState<BigNumber | undefined>(undefined);
    const [isPaused, setIsPaused] = useState<boolean | undefined>(undefined);
    const [erc20TokenAddress, setErc20TokenAddress] = useState<string | undefined>(undefined);
    const [depositFee, setVaultDepositFee] = useState<BigNumber | undefined>(undefined);
    const [withdrawFee, setVaultWithdrawFee] = useState<BigNumber | undefined>(undefined);

    const erc20TokenContractData = useErc20TokenForAddress(erc20TokenAddress, vaultChainId, vaultAddress, undefined);

    // Get Erc20TokenAddress / isVaultActive / availableDeposit
    useEffect(() => {
        let stale = false;
        if (vaultContract !== undefined) {
            vaultContract.methods
                .token()
                .call()
                .then((address: string) => {
                    if (!stale && expectedErc20Address.toLowerCase() === address.toLowerCase()) {
                        setErc20TokenAddress(address);
                    }
                });
            vaultContract.methods
                .availableDepositLimit()
                .call()
                .then((amount: string) => {
                    if (!stale && isGoodBignumber(amount, false)) {
                        setAvailableDeposit(new BigNumber(amount));
                    }
                });
            vaultContract.methods
                .emergencyShutdown()
                .call()
                .then((isShutDown: boolean) => {
                    if (!stale) {
                        setIsPaused(isShutDown);
                    }
                });
            vaultContract.methods
                .withdrawFee()
                .call()
                .then((amount: string) => {
                    if (!stale && isGoodBignumber(amount, false)) {
                        setVaultWithdrawFee(new BigNumber(amount));
                    }
                });
            vaultContract.methods
                .depositFee()
                .call()
                .then((amount: string) => {
                    if (!stale && isGoodBignumber(amount, false)) {
                        setVaultDepositFee(new BigNumber(amount));
                    }
                });
        }
        return () => {
            stale = true;
            setErc20TokenAddress(undefined);
            setAvailableDeposit(undefined);
            setVaultDepositFee(undefined);
            setVaultDepositFee(undefined);
        };
    }, [vaultContract, expectedErc20Address]);

    const saveWithdraw = useCallback(
        (encodedEvent: string, rawSignatures: string[], fromAddress: string, txType: string): any => {
            if (!vaultContract || !web3) throw 'Contract not initialized';

            const signatures = rawSignatures.map((sign) => {
                const signature = `0x${Buffer.from(sign, 'base64').toString('hex')}`;
                const address = web3.eth.accounts.recover(web3.utils.sha3(encodedEvent)!, signature);
                return {
                    address,
                    order: new BigNumber(address.slice(2).toUpperCase(), 16),
                    signature,
                };
            });

            signatures.sort((a, b) => {
                if (a.order.eq(b.order)) {
                    return 0;
                }

                if (a.order.gt(b.order)) {
                    return 1;
                }

                return -1;
            });

            return vaultContract.methods
                .saveWithdraw(
                    encodedEvent,
                    signatures.map(({signature}) => signature),
                )
                .send({
                    from: fromAddress,
                    type: txType,
                });
        },
        [vaultContract, web3],
    );

    const isDataLoaded =
        erc20TokenContractData &&
        availableDeposit !== undefined &&
        isPaused !== undefined &&
        depositFee !== undefined &&
        withdrawFee !== undefined &&
        vaultContract !== undefined &&
        saveWithdraw !== undefined;

    return isDataLoaded
        ? {
              availableDeposit,
              depositFee,
              withdrawFee,
              balance: erc20TokenContractData.accountBalance,
              address: vaultAddress,
              isPaused,
              contract: vaultContract,
              saveWithdraw,
          }
        : undefined;
};

type EventData = {
    eventTransactionLt: string;
    eventTimestamp: string;
    eventData: string;
    configurationWid: string;
    configurationAddressValue: string;
    eventContractWid: string;
    eventContractAddressValue: string;
    round: string;
};

export const useEncodedEvent = (
    eventData: EventData | undefined,
    chainId: string | undefined,
    eventAbi: string | undefined,
    configurationProxy: string | undefined,
): string | undefined => {
    const {web3} = useEvmWallet();

    return useMemo(
        function () {
            if (!!eventData && !!chainId && !!eventAbi && !!configurationProxy && !!web3) {
                const eventDataEncoded = mapTonCellIntoEthBytes(
                    Buffer.from(eventAbi, 'base64').toString(),
                    eventData.eventData,
                );

                return web3.eth.abi.encodeParameters(
                    [
                        {
                            TONEvent: {
                                eventTransactionLt: 'uint64',
                                eventTimestamp: 'uint32',
                                eventData: 'bytes',
                                configurationWid: 'int8',
                                configurationAddress: 'uint256',
                                eventContractWid: 'int8',
                                eventContractAddress: 'uint256',
                                proxy: 'address',
                                round: 'uint32',
                            },
                        },
                    ],
                    [
                        {
                            eventTransactionLt: eventData.eventTransactionLt,
                            eventTimestamp: eventData.eventTimestamp,
                            eventData: eventDataEncoded,
                            configurationWid: eventData.configurationWid,
                            configurationAddress: `0x${eventData.configurationAddressValue}`,
                            eventContractWid: eventData.eventContractWid,
                            eventContractAddress: `0x${eventData.eventContractAddressValue}`,
                            proxy: `0x${new BigNumber(configurationProxy).toString(16).padStart(40, '0')}`,
                            round: eventData.round,
                        },
                    ],
                );
            }
            return undefined;
        },
        [eventData, chainId, eventAbi, configurationProxy, web3],
    );
};

export const useWithdrawId = (encodedEvent: string | undefined): string | undefined => {
    const {web3} = useEvmWallet();

    return useMemo(
        function () {
            if (!!encodedEvent && !!web3) {
                return web3.utils.keccak256(encodedEvent);
            }
            return undefined;
        },
        [encodedEvent, web3],
    );
};

export const useWithdrawalReleaseStatus = (
    withdrawId: string | undefined,
    vaultAddress: string | undefined,
    vaultChainId: string | undefined,
) => {
    const contract = useVaultContract(vaultAddress, vaultChainId);
    const [isReleased, setIsReleased] = useState<boolean | undefined>(undefined);

    useEffect(
        function () {
            if (contract && withdrawId) {
                let stale = false;
                // TODO use subscription on events
                const update = async () => {
                    const status = await contract.methods.withdrawalIds(withdrawId).call();
                    if (!stale) setIsReleased(status);
                    if (status === true) clearInterval(interval);
                };
                update();
                const interval = setInterval(update, 20000);
                return () => {
                    stale = true;
                    clearInterval(interval);
                    setIsReleased(undefined);
                };
            }
        },
        [contract, withdrawId],
    );

    return isReleased;
};
