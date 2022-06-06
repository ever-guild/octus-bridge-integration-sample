import {
    EthEventVoteData,
    EverWalletConnectionStatus,
    EvmVaultConfig,
    EvmWalletConnectionStatus,
    NetworkShape,
} from '@/types';
import {useBlockChecking, useEvmWallet} from '@/providers/EvmWalletProvider';
import {
    CreditFactoryAddress,
    DefaultDenominator,
    DefaultNumerator,
    useEverWallet,
} from '@/providers/EverWalletProvider';
import BigNumber from 'bignumber.js';
import {formatTokenValue, isGoodBignumber} from '@/utils';
import {Address, Transaction} from 'everscale-inpage-provider';
import {useVaultContractWithData} from '@/providers/EvmWalletProvider/hooks/vault';
import {useErc20TokenForAddress} from '@/providers/EvmWalletProvider/hooks/erc20';
import {useTokenRoot} from '@/providers/EverWalletProvider/hooks/tokenRoot';
import {useEvmConfiguration} from '@/providers/EverWalletProvider/hooks/evmConfiguration';
import {useEvmTokenTransferProxy} from '@/providers/EverWalletProvider/hooks/evmTokenTransferProxy';
import {useCreditFactory} from '@/providers/EverWalletProvider/hooks/creditFactory';

export type EvmEverscalePipeline =
    | {
          isLoaded: false;
      }
    | {
          isLoaded: true;
          sourceAccount: string;
          destinationAccount: string;
          checkIsAllowanceEnough: (amount: string) => boolean;
          checkLimitsForAmount: (amount: string) => {result: boolean; error: string};
          vaultAddress: string;
          vaultBalance: BigNumber;
          vaultAvailableDeposit: BigNumber;
          tip3Decimals: number;
          erc20Decimals: number;
          erc20RequestApprove: (address: string, nanoTokens: BigNumber, transactionType: string) => Promise<any>;
          blocksToConfirm: number;
          deposit: (amount: BigNumber, destinationAddress: string) => any;
          depositToFactory: (
              amount: BigNumber,
              minEversAmount: BigNumber,
              minTokensAmount: BigNumber,
              destinationAddress: string,
          ) => any;
          eventABI: string;
          deriveEventAddress: (eventVoteData: EthEventVoteData) => Promise<string>;
          deriveCreditProcessorAddress: (eventVoteData: EthEventVoteData) => Promise<string>;
          deployEvent: (eventVoteData: EthEventVoteData, fromAddress: string) => Promise<Transaction<Address>>;
          creditFactoryFee: BigNumber;
          error: string | undefined;
      };

export const useEvmEverscalePipeline = (
    sourceNetwork: NetworkShape,
    destinationNetwork: NetworkShape,
    vaultConfig: EvmVaultConfig,
): EvmEverscalePipeline => {
    // Logic there is simple, we have a lot of hooks for get contract data and accounts.

    // All hooks as params can accepts UNDEFINIED or Value and return {isLoaded: bool, ...params}.
    // So, if we have not connected wallets or previous contract on which one next hook is depend
    // is not loaded yet then hook will return {isLoaded: false}.
    // And after we connect wallets they will start to fetch and validate data one by one.
    // After all contracts is loaded we can go further.

    // Get sourceAccount and destinationAccount if connected.
    const {account: sourceAccount, getMetamaskConnectionStatusForChainId} = useEvmWallet();
    const {account: destinationAccount, connectionStatus: everWalletConnectionStatus} = useEverWallet();

    // Get vault contract availableDeposit/isPaused/erc20TokenAddress
    const vaultContractWithData = useVaultContractWithData(
        vaultConfig.vaultEvmAddress,
        sourceNetwork.chainId,
        vaultConfig.tokenEvmAddress,
    );

    // Get erc20 contract tokenSymbol + tokenDecimals + accountBalance + accountAllowance?(if requested)
    const erc20TokenContractForSourceAccount = useErc20TokenForAddress(
        vaultConfig.tokenEvmAddress,
        sourceNetwork.chainId,
        sourceAccount,
        vaultConfig.vaultEvmAddress,
    );

    // Get tip3 root contract decimals/symbol
    const targetTip3TokenContract = useTokenRoot(new Address(vaultConfig.tip3RootAddress));

    // Get evm configuration contract connectionStatus/basicConfiguration/networkConfiguration
    const evmConfigurationContract = useEvmConfiguration(vaultConfig.ethereumConfigurationAddress);

    // check is current network block is higher than evmConfigurationContract.networkConfiguration.startBlockNumber
    const isEvmConfigurationStarted = useBlockChecking(evmConfigurationContract?.networkConfiguration.startBlockNumber);

    // Get proxy contract isPaused/everConfigurationAddress/evmConfigurationAddresses/tokenRoot
    const proxyContract = useEvmTokenTransferProxy(vaultConfig.tip3ProxyAddress);

    const creditFactorContract = useCreditFactory();

    // Contracts are not loaded yet or Wallets are not connected
    if (
        !vaultContractWithData ||
        !erc20TokenContractForSourceAccount ||
        !targetTip3TokenContract ||
        !evmConfigurationContract ||
        !creditFactorContract ||
        isEvmConfigurationStarted === undefined ||
        !proxyContract ||
        sourceNetwork.type !== 'evm' ||
        destinationNetwork.type !== 'everscale' ||
        getMetamaskConnectionStatusForChainId(vaultConfig.chainId) !== EvmWalletConnectionStatus.Ok ||
        everWalletConnectionStatus !== EverWalletConnectionStatus.Ok ||
        destinationAccount === undefined ||
        sourceAccount === undefined
    ) {
        return {
            isLoaded: false,
        };
    }

    // helper to check is we need allowance first
    const checkIsAllowanceEnough = (amount: string): boolean => {
        if (!isGoodBignumber(amount, false)) return false;
        const nanoamount = new BigNumber(amount).shiftedBy(erc20TokenContractForSourceAccount.tokenDecimals);
        return !nanoamount.gt(erc20TokenContractForSourceAccount.accountAllowance);
    };

    // helper to check is vault limits enough to accept such amount and check is token balance is lte then amount
    const checkLimitsForAmount = (amount: string): {result: boolean; error: string} => {
        if (!isGoodBignumber(amount, false)) return {result: false, error: ''};

        const nanoAmount = new BigNumber(amount).shiftedBy(erc20TokenContractForSourceAccount.tokenDecimals);
        if (nanoAmount.gt(erc20TokenContractForSourceAccount.accountBalance)) {
            return {
                result: false,
                error: `Amount is greater than the account token balance which one is ${formatTokenValue(
                    new BigNumber(erc20TokenContractForSourceAccount.accountBalance),
                    erc20TokenContractForSourceAccount.tokenDecimals,
                )}`,
            };
        } else if (nanoAmount.gt(vaultContractWithData.availableDeposit)) {
            return {
                result: false,
                error: `Amount is greater than the available deposit which one is ${formatTokenValue(
                    new BigNumber(vaultContractWithData.availableDeposit),
                    erc20TokenContractForSourceAccount.tokenDecimals,
                )}`,
            };
        } else {
            return {
                result: true,
                error: '',
            };
        }
    };

    const deposit = (amount: BigNumber, destinationAddress: string): any => {
        const parsedDestinationAddress = [destinationAddress.split(':')[0], `0x${destinationAddress.split(':')[1]}`];

        return vaultContractWithData.contract.methods.deposit(parsedDestinationAddress, amount.toFixed()).send({
            from: sourceAccount,
            type: sourceNetwork.transactionType,
        });
    };

    const depositToFactory = (
        amount: BigNumber,
        minEversAmount: BigNumber,
        minTokensAmount: BigNumber,
        destinationAddress: string,
    ): any => {
        const parsedDestinationAddress = [destinationAddress.split(':')[0], `0x${destinationAddress.split(':')[1]}`];

        return vaultContractWithData.contract.methods
            .depositToFactory(
                amount.toFixed(),
                parsedDestinationAddress[0],
                parsedDestinationAddress[1],
                `0x${CreditFactoryAddress.toString().split(':')[1]}`,
                parsedDestinationAddress[1],
                minTokensAmount.toFixed(),
                minEversAmount.toFixed(),
                '0',
                DefaultNumerator,
                DefaultDenominator,
                `0x${Buffer.from('te6ccgEBAQEAAgAAAA==', 'base64').toString('hex')}`,
            )
            .send({
                from: sourceAccount,
                type: sourceNetwork.transactionType,
            });
    };

    // Okay some extra validation there.
    let error = undefined;

    // If evm configuration stopped
    if (evmConfigurationContract.networkConfiguration.endBlockNumber !== 0) {
        // TODO we can check is endBlockNumber is gt current block number + N, but it is not in scope of this example
        // So we just check is endBlockNumber is set or not.
        error = 'Evm configuration networkConfiguration endBlockNumber is set';
    }

    if (vaultContractWithData.isPaused) {
        error = 'Vault is emergency paused';
    }

    if (evmConfigurationContract.networkConfiguration.chainId !== sourceNetwork.chainId) {
        // Something is bad with our data.
        error = 'Evm configuration has wrong chain ID';
    }

    if (evmConfigurationContract.networkConfiguration.eventEmitter !== vaultContractWithData.address) {
        // Something is bad with our data.
        error = 'Evm configuration has wrong vault address';
    }

    if (proxyContract.isPaused) {
        error = 'Proxy contract is emergency paused';
    }

    if (proxyContract.tokenRoot.toString() !== targetTip3TokenContract.address.toString()) {
        error = 'Mismatch token root addresses';
    }

    if (!vaultContractWithData.depositFee.eq(new BigNumber(0))) {
        error = 'Vault deposit fee is not 0';
    }

    if (!vaultContractWithData.withdrawFee.eq(new BigNumber(0))) {
        error = 'Vault withdraw fee is not 0';
    }

    if (
        !proxyContract.evmConfigurationAddresses.find(
            (a) => a.toString() === evmConfigurationContract.address.toString(),
        )
    ) {
        error = 'Proxy contract does not contain evm configuration';
    }

    return {
        isLoaded: true,
        sourceAccount: sourceAccount,
        destinationAccount: destinationAccount.address.toString(),
        checkIsAllowanceEnough,
        checkLimitsForAmount,
        vaultAddress: vaultContractWithData.address,
        vaultBalance: vaultContractWithData.balance,
        vaultAvailableDeposit: vaultContractWithData.availableDeposit,
        tip3Decimals: targetTip3TokenContract.decimals,
        erc20Decimals: erc20TokenContractForSourceAccount.tokenDecimals,
        erc20RequestApprove: erc20TokenContractForSourceAccount.requestApprove,
        blocksToConfirm: evmConfigurationContract.networkConfiguration.eventBlocksToConfirm,
        deposit,
        depositToFactory,
        eventABI: evmConfigurationContract.basicConfiguration.eventABI,
        deriveEventAddress: evmConfigurationContract.deriveEventAddress,
        deriveCreditProcessorAddress: (eventVoteData: EthEventVoteData) => {
            return creditFactorContract.deriveCreditProcessorAddress(evmConfigurationContract.address, eventVoteData);
        },
        deployEvent: evmConfigurationContract.deployEvent,
        creditFactoryFee: creditFactorContract.fee,
        error: error,
    };
};
