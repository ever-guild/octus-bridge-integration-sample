import {NetworkShape} from '@/types';

//Available networks
export const Networks: NetworkShape[] = [
    {
        chainId: '1',
        currencySymbol: 'ETH',
        explorerBaseUrl: 'https://etherscan.io/',
        id: 'evm-1',
        label: 'Ethereum',
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        transactionType: '0x2',
        type: 'evm',
    },
    {
        chainId: '56',
        currencySymbol: 'BNB',
        explorerBaseUrl: 'https://bscscan.com/',
        id: 'evm-56',
        label: 'BNB Chain (Binance Smart Chain)',
        name: 'BNB Chain',
        rpcUrl: 'https://bsc-dataseed.binance.org/',
        transactionType: '0x0',
        type: 'evm',
    },
    {
        chainId: '250',
        currencySymbol: 'FTM',
        explorerBaseUrl: 'https://ftmscan.com/',
        id: 'evm-250',
        label: 'Fantom Opera',
        name: 'Fantom Opera',
        rpcUrl: 'https://rpc.ftm.tools/',
        transactionType: '0x0',
        type: 'evm',
    },
    {
        chainId: '137',
        currencySymbol: 'MATIC',
        explorerBaseUrl: 'https://polygonscan.com/',
        id: 'evm-137',
        label: 'Polygon',
        name: 'Polygon',
        rpcUrl: 'https://matic-mainnet.chainstacklabs.com/',
        transactionType: '0x0',
        type: 'evm',
    },
    {
        chainId: '1',
        currencySymbol: 'EVER',
        explorerBaseUrl: 'https://everscan.io/',
        id: 'everscale-1',
        label: 'Everscale',
        name: 'Everscale',
        rpcUrl: '',
        type: 'everscale',
    },
];

export function GetNetworkShapeById(id: string) {
    return Networks.find((n) => n.id === id);
}
