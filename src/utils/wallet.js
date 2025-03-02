import { WalletConnectV2Provider, ExtensionProvider } from '@multiversx/sdk-wallet/dist/walletcore';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers/out';

class WalletProvider {
    constructor() {
        this.wcProvider = null;
        this.extProvider = null;
        this.networkProvider = new ProxyNetworkProvider('https://devnet-gateway.multiversx.com');
        this.initialized = false;
    }

    async initWalletConnect() {
        if (!this.wcProvider) {
            const provider = new WalletConnectV2Provider({
                chainId: 'D',
                projectId: '543d1163a2a290ff3ae68741b565a6d4',
                metadata: {
                    name: 'BetX',
                    description: 'BetX Platform',
                    url: window.location.origin,
                    icons: ['https://your-icon-url.png']
                }
            });
            await provider.init();
            this.wcProvider = provider;
        }
        return this.wcProvider;
    }

    async initExtension() {
        if (!this.extProvider) {
            const provider = ExtensionProvider.getInstance();
            await provider.init();
            this.extProvider = provider;
        }
        return this.extProvider;
    }

    async loginWithWalletConnect() {
        try {
            const provider = await this.initWalletConnect();
            await provider.login();
            const address = await provider.getAddress();
            return {
                success: true,
                address,
                provider: 'walletconnect'
            };
        } catch (error) {
            console.error('WalletConnect login error:', error);
            return {
                success: false,
                error: error.message || 'Failed to connect with WalletConnect'
            };
        }
    }

    async loginWithExtension() {
        try {
            const provider = await this.initExtension();
            await provider.login();
            const address = await provider.getAddress();
            return {
                success: true,
                address,
                provider: 'extension'
            };
        } catch (error) {
            console.error('Extension login error:', error);
            return {
                success: false,
                error: error.message || 'Failed to connect with Extension'
            };
        }
    }

    async logout() {
        try {
            if (this.wcProvider && await this.wcProvider.isConnected()) {
                await this.wcProvider.logout();
            }
            if (this.extProvider && await this.extProvider.isConnected()) {
                await this.extProvider.logout();
            }
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return {
                success: false,
                error: error.message || 'Failed to disconnect wallet'
            };
        }
    }

    async getAddress() {
        try {
            if (this.wcProvider && await this.wcProvider.isConnected()) {
                return await this.wcProvider.getAddress();
            }
            if (this.extProvider && await this.extProvider.isConnected()) {
                return await this.extProvider.getAddress();
            }
            return null;
        } catch (error) {
            console.error('Get address error:', error);
            return null;
        }
    }

    async isConnected() {
        try {
            if (this.wcProvider && await this.wcProvider.isConnected()) {
                return true;
            }
            if (this.extProvider && await this.extProvider.isConnected()) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('Connection check error:', error);
            return false;
        }
    }
}

export const walletProvider = new WalletProvider();
