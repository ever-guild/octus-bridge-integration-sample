import {EverWalletConnectionStatus, EvmVaultConfig, EvmWalletConnectionStatus, NetworkShape} from '@/types';
import {useEvmWallet} from '@/providers/EvmWalletProvider';
import {useEverWallet} from '@/providers/EverWalletProvider';
import BigNumber from 'bignumber.js';
import {Address} from 'everscale-inpage-provider';
import {useVaultContractWithData, VaultData} from '@/providers/EvmWalletProvider/hooks/vault';
import {Erc20TokenContract, useErc20TokenForAddress} from '@/providers/EvmWalletProvider/hooks/erc20';
import {useTokenRoot} from '@/providers/EverWalletProvider/hooks/tokenRoot';
import {useTokenWallet} from '@/providers/EverWalletProvider/hooks/tokenWallet';
import {useEvmTokenTransferProxy} from '@/providers/EverWalletProvider/hooks/evmTokenTransferProxy';
import {useEverscaleConfiguration} from '@/providers/EverWalletProvider/hooks/everscaleConfiguration';

export type EverscaleEvmPipeline =
    | {
          isLoaded: false;
          sourceAccount: Address | undefined;
          destinationAccount: string | undefined;
      }
    | {
          isLoaded: true;
          sourceAccount: Address;
          destinationAccount: string;
          destinationChainId: string;
          vaultAddress: string;
          vaultBalance: BigNumber;
          tip3Decimals: number;
          erc20Decimals: number;
          userTokenBalance: BigNumber;
          configurationAddress: Address;
          configurationEvmProxy: string; // proxy address which one is set in _networkConfiguration.proxy
          eventABI: string;
          depositToBridge: (amount: string, evmAddress: string) => Promise<Address>;
          saveWithdraw: (encodedEvent: string, rawSignatures: string[]) => any;
          error: string | undefined;
      };

export const useEverscaleEvmPipeline = (
    sourceNetwork: NetworkShape,
    destinationNetwork: NetworkShape,
    vaultConfig: EvmVaultConfig,
): EverscaleEvmPipeline => {
    // Logic there is simple, we have a lot of hooks for get contract data and accounts.

    // All hooks as params can accepts UNDEFINIED or Value and return {isLoaded: bool, ...params}.
    // So, if we have not connected wallets or previous contract on which one next hook is depend
    // is not loaded yet then hook will return {isLoaded: false}.
    // And after we connect wallets they will start to fetch and validate data one by one.
    // After all contracts is loaded we can go further.

    // Get sourceAccount and destinationAccount if connected.
    const {account: destinationAccount, getMetamaskConnectionStatusForChainId} = useEvmWallet();
    const {account: sourceAccount, connectionStatus: everWalletConnectionStatus} = useEverWallet();

    // Get vault contract availableDeposit/isPaused/erc20TokenAddress
    const vaultContractWithData: VaultData | undefined = useVaultContractWithData(
        vaultConfig.vaultEvmAddress,
        destinationNetwork.chainId,
        vaultConfig.tokenEvmAddress,
    );

    // Get erc20 contract tokenSymbol + tokenDecimals + accountBalance + accountAllowance?(if requested)
    const erc20TokenContractForTargetAccount: Erc20TokenContract | undefined = useErc20TokenForAddress(
        vaultConfig.tokenEvmAddress,
        destinationNetwork.chainId,
        destinationAccount,
        vaultConfig.vaultEvmAddress,
    );

    // Get tip3 root contract decimals/symbol
    const tip3RootTokenContract = useTokenRoot(new Address(vaultConfig.tip3RootAddress));
    const tip3WalletContact = useTokenWallet(new Address(vaultConfig.tip3RootAddress), sourceAccount?.address);

    const proxyContract = useEvmTokenTransferProxy(vaultConfig.tip3ProxyAddress);

    // Get everscale configuration contract basicConfiguration/networkConfiguration/is_paused
    const everscaleConfiguration = useEverscaleConfiguration(proxyContract?.everscaleConfigurationAddress);

    // Contracts are not loaded yet or Wallets are not connected
    if (
        !vaultContractWithData ||
        !erc20TokenContractForTargetAccount ||
        !tip3RootTokenContract ||
        !everscaleConfiguration ||
        !proxyContract ||
        !tip3WalletContact ||
        sourceNetwork.type !== 'everscale' ||
        destinationNetwork.type !== 'evm' ||
        getMetamaskConnectionStatusForChainId(vaultConfig.chainId) !== EvmWalletConnectionStatus.Ok ||
        everWalletConnectionStatus !== EverWalletConnectionStatus.Ok ||
        destinationAccount === undefined ||
        sourceAccount === undefined
    ) {
        return {
            isLoaded: false,
            sourceAccount: sourceAccount?.address,
            destinationAccount,
        };
    }

    // Okay some extra validation there.
    let error = undefined;

    // If evm configuration stopped
    if (everscaleConfiguration.networkConfiguration.endTimestamp !== '0') {
        // TODO we can check is endTimestamp is gt current ts + N, but it is not in scope of this example
        error = 'Everscale configuration networkConfiguration endTimestamp is set';
    }

    if (vaultContractWithData.isPaused) {
        error = 'Vault is emergency paused';
    }

    if (everscaleConfiguration.networkConfiguration.eventEmitter.toString() !== vaultConfig.tip3ProxyAddress) {
        // Something is bad with our data.
        error = 'Evm configuration has wrong vault address';
    }

    if (proxyContract.isPaused) {
        error = 'Proxy contract is emergency paused';
    }

    if (proxyContract.tokenRoot.toString() !== tip3RootTokenContract.address.toString()) {
        error = 'Mismatch token root addresses';
    }

    if (!vaultContractWithData.depositFee.eq(new BigNumber(0))) {
        error = 'Vault deposit fee is not 0';
    }

    if (!vaultContractWithData.withdrawFee.eq(new BigNumber(0))) {
        error = 'Vault withdraw fee is not 0';
    }

    return {
        isLoaded: true,
        sourceAccount: sourceAccount.address,
        destinationAccount: destinationAccount.toString(),
        destinationChainId: vaultConfig.chainId,
        vaultAddress: vaultContractWithData.address,
        vaultBalance: vaultContractWithData.balance,
        userTokenBalance: tip3WalletContact.walletBalance,
        configurationAddress: proxyContract.everscaleConfigurationAddress,
        configurationEvmProxy: everscaleConfiguration.networkConfiguration.proxy,
        tip3Decimals: tip3RootTokenContract.decimals,
        erc20Decimals: erc20TokenContractForTargetAccount.tokenDecimals,
        eventABI: everscaleConfiguration.basicConfiguration.eventABI,
        depositToBridge: async (amount: string, evmAddress: string): Promise<Address> => {
            // get last transaction id for configuration;
            const lastConfigurationLt = await everscaleConfiguration.getLastTransactionLt();
            if (!lastConfigurationLt) return Promise.reject('Failed to fetch last everscale configuration lt');
            // send burn tx
            await tip3WalletContact.burn(
                amount,
                new Address(vaultConfig.tip3ProxyAddress),
                everscaleConfiguration.basicConfiguration.eventInitialBalance
                    .plus(new BigNumber('1000000000'))
                    .toFixed(),
                evmAddress,
                destinationNetwork.chainId,
            );
            // fetch the last event from deposit account to target from lt.
            return await everscaleConfiguration.getEventAddress(
                lastConfigurationLt,
                sourceAccount.address.toString(),
                evmAddress,
            );
        },
        saveWithdraw: (encodedEvent: string, rawSignatures: string[]): any => {
            return vaultContractWithData.saveWithdraw(
                encodedEvent,
                rawSignatures,
                destinationAccount,
                destinationNetwork.transactionType!,
            );
        },
        error: error,
    };
};
