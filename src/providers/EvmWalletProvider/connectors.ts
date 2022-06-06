import {Web3Provider} from '@ethersproject/providers';
import {InjectedConnector} from '@web3-react/injected-connector';
import {Networks} from '@/misc/networks';
import {ExternalProvider, JsonRpcFetchFunc} from '@ethersproject/providers/src.ts/web3-provider';

export function GetProviderLibrary(provider: ExternalProvider | JsonRpcFetchFunc): Web3Provider {
    const library = new Web3Provider(provider);
    library.pollingInterval = 10000;
    return library;
}

export const injected = new InjectedConnector({
    supportedChainIds: Networks.filter((n) => n.type === 'evm').map((n) => parseInt(n.chainId)),
});
