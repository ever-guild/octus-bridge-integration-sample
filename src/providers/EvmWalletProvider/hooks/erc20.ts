import {ChainId, EvmWalletConnectionStatus} from '@/types';
import {Contract as EthContract} from 'web3-eth-contract';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {EthAbi} from '@/misc/eth-abi';
import BigNumber from 'bignumber.js';
import {isGoodBignumber} from '@/utils';
import {useEvmWallet} from '@/providers/EvmWalletProvider';

export const useErc20TokenContract = function (
    tokenAddress: string | undefined,
    tokenChainId: ChainId,
): EthContract | undefined {
    const {web3, getMetamaskConnectionStatusForChainId, chainId, active} = useEvmWallet();

    return useMemo(
        function (): EthContract | undefined {
            if (
                !tokenAddress ||
                !web3 ||
                !active ||
                tokenChainId !== chainId ||
                getMetamaskConnectionStatusForChainId(tokenChainId) !== EvmWalletConnectionStatus.Ok
            ) {
                return undefined;
            } else {
                return new web3.eth.Contract(EthAbi.ERC20, tokenAddress);
            }
        },
        [chainId, web3, active, tokenChainId, tokenAddress],
    );
};

export type Erc20TokenContract = {
    tokenDecimals: number;
    tokenSymbol: string;
    accountBalance: BigNumber;
    accountAllowance: BigNumber;
    requestApprove: (address: string, nanoTokens: BigNumber, transactionType: string) => Promise<any>;
};

// Get erc20 token data (symbol, decimals, balance) for address, also can fetch allowance for another address
export const useErc20TokenForAddress = function (
    tokenAddress: string | undefined,
    tokenChainId: ChainId,
    accountAddress: string | undefined,
    checkAllowanceForAddress: string | undefined,
): Erc20TokenContract | undefined {
    const erc20Contract = useErc20TokenContract(tokenAddress, tokenChainId);

    const [tokenSymbol, setTokenSymbol] = useState<string | undefined>(undefined);
    const [tokenDecimals, setTokenDecimals] = useState<number | undefined>(undefined);
    const [accountBalance, setAccountBalance] = useState<BigNumber | undefined>(undefined);
    const [accountAllowance, setAccountAllowance] = useState<BigNumber | undefined>(undefined);

    //fetch metadata
    useEffect(() => {
        let stale = false;
        if (erc20Contract) {
            erc20Contract.methods
                .decimals()
                .call()
                .then((decimals: string) => {
                    if (!stale && !isNaN(parseInt(decimals)) && parseInt(decimals) >= 0) {
                        setTokenDecimals(parseInt(decimals));
                    }
                });
            erc20Contract.methods
                .symbol()
                .call()
                .then((symbol: string) => {
                    if (!stale) {
                        setTokenSymbol(symbol);
                    }
                });
            return () => {
                stale = true;
                setTokenSymbol(undefined);
                setTokenDecimals(undefined);
            };
        }
    }, [erc20Contract, tokenAddress]);

    // fetch balance and allowance also update via timer
    // TODO make update via subscribe on events.
    useEffect(() => {
        let stale = false;
        if (erc20Contract && accountAddress) {
            const update = () => {
                erc20Contract.methods
                    .balanceOf(accountAddress)
                    .call()
                    .then((balance: string) => {
                        if (!stale && isGoodBignumber(balance, false)) {
                            setAccountBalance((prevState) => {
                                if (prevState?.eq(new BigNumber(balance))) return prevState;
                                return new BigNumber(balance);
                            });
                        }
                    });

                checkAllowanceForAddress &&
                    erc20Contract.methods
                        .allowance(accountAddress, checkAllowanceForAddress)
                        .call()
                        .then((amount: string) => {
                            if (!stale && isGoodBignumber(amount, false)) {
                                setAccountAllowance((prevState) => {
                                    if (prevState?.eq(new BigNumber(amount))) return prevState;
                                    return new BigNumber(amount);
                                });
                            }
                        });
            };
            !checkAllowanceForAddress && setAccountAllowance(new BigNumber(0));
            update();
            const interval = setInterval(update, 20000);
            return () => {
                clearInterval(interval);
                stale = true;
                setAccountBalance(undefined);
                setAccountAllowance(undefined);
            };
        }
    }, [erc20Contract, accountAddress, checkAllowanceForAddress]);

    const requestApprove = useCallback(
        (forAddress: string, nanoTokens: BigNumber, transactionType: string) => {
            return erc20Contract?.methods.approve(forAddress, nanoTokens.toFixed()).send({
                from: accountAddress,
                type: transactionType,
            });
        },
        [erc20Contract, accountAddress],
    );

    const isDataLoaded =
        tokenSymbol !== undefined &&
        tokenDecimals !== undefined &&
        accountBalance !== undefined &&
        accountAllowance !== undefined;

    return isDataLoaded ? {tokenDecimals, tokenSymbol, accountBalance, accountAllowance, requestApprove} : undefined;
};
