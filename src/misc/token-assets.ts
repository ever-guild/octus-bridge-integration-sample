import {EverTokenAsset} from '@/types';

// from https://github.com/broxus/ton-assets
export const EverTokenAssets: EverTokenAsset[] = [
    {
        name: 'Wrapped EVER',
        chainId: '1',
        symbol: 'WEVER',
        decimals: 9,
        rootAddress: '0:a49cd4e158a9a15555e624759e2e4e766d22600b7800d891e46f9291f044a93d',
        icon: 'https://raw.githubusercontent.com/broxus/ton-assets/master/icons/WEVER/logo.svg',
        version: 5,
        verified: true,
        vendor: 'broxus',
    },
    {
        name: 'Dai Stablecoin',
        chainId: '1',
        symbol: 'DAI',
        decimals: 18,
        rootAddress: '0:eb2ccad2020d9af9cec137d3146dde067039965c13a27d97293c931dae22b2b9',
        icon: 'https://raw.githubusercontent.com/broxus/ton-assets/master/icons/DAIv3/logo.svg',
        version: 5,
        verified: true,
        vendor: 'broxus',
    },
    {
        name: 'Tether',
        chainId: '1',
        symbol: 'USDT',
        decimals: 6,
        rootAddress: '0:a519f99bb5d6d51ef958ed24d337ad75a1c770885dcd42d51d6663f9fcdacfb2',
        icon: 'https://raw.githubusercontent.com/broxus/ton-assets/master/icons/USDTv3/logo.svg',
        version: 5,
        verified: true,
        vendor: 'broxus',
    },
    {
        name: 'USD Coin',
        chainId: '1',
        symbol: 'USDC',
        decimals: 6,
        rootAddress: '0:c37b3fafca5bf7d3704b081fde7df54f298736ee059bf6d32fac25f5e6085bf6',
        icon: 'https://raw.githubusercontent.com/broxus/ton-assets/master/icons/USDCv3/logo.svg',
        version: 5,
        verified: true,
        vendor: 'broxus',
    },
    {
        name: 'Wrapped BTC',
        chainId: '1',
        symbol: 'WBTC',
        decimals: 8,
        rootAddress: '0:2ba32b75870d572e255809b7b423f30f36dd5dea075bd5f026863fceb81f2bcf',
        icon: 'https://raw.githubusercontent.com/broxus/ton-assets/master/icons/WBTCv3/logo.svg',
        version: 5,
        verified: true,
        vendor: 'broxus',
    },
    {
        name: 'Wrapped Ether',
        chainId: '1',
        symbol: 'WETH',
        decimals: 18,
        rootAddress: '0:59b6b64ac6798aacf385ae9910008a525a84fc6dcf9f942ae81f8e8485fe160d',
        icon: 'https://raw.githubusercontent.com/broxus/ton-assets/master/icons/WETHv3/logo.svg',
        version: 5,
        verified: true,
        vendor: 'broxus',
    },
];

export function GetTokenAssetByRoot(rootAddress: string) {
    return EverTokenAssets.find((n) => n.rootAddress === rootAddress);
}
