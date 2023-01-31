import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';

import { emitter } from './events/emitter';
import { AuthDiscordCredentials, AuthTokens, TokenRecord } from './types/auth.type';
import { TookeyWeb3EventKey, TookeyWeb3Events, TookeyWeb3Options } from './types/instance.type';
import { TransactionUnsigned } from './types/transaction.type';
import { User, UserWithWallet, Wallet } from './types/user.type';
import { canUseDom, getPath } from './utils';
import { clientOptionsSchema } from './validators';

export class TookeyWeb3 {
  private _client: AxiosInstance;
  private _baseURL: string;
  private _user?: UserWithWallet;
  public userRefreshToken?: string;

  constructor(options: TookeyWeb3Options) {
    const result = clientOptionsSchema.validate(options);
    if (result.error) throw result.error;

    const { baseURL } = result.value;
    this._baseURL = baseURL;
    this._client = axios.create({ baseURL });

    this._client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && error.response.status === 401 && this.userRefreshToken) {
          try {
            await this.refreshToken();
            return await this._client.request(error.config);
          } catch (err) {
            console.error(err);
            return error;
          }
        } else {
          return error;
        }
      },
    );

    return this;
  }

  get user(): UserWithWallet {
    return this._user!;
  }

  private set user(value: UserWithWallet) {
    this._user = value;
  }

  get wallet(): Wallet {
    return this._user!.wallet;
  }

  /** Get current user */
  get isLoggedIn(): boolean {
    return !!this.user && !!this.userRefreshToken;
  }

  private static emit<T extends TookeyWeb3EventKey>(event: T, payload: TookeyWeb3Events[T]): void {
    return emitter.emit(event, payload);
  }

  on<T extends TookeyWeb3EventKey>(event: T, handler: (payload: TookeyWeb3Events[T]) => void): void {
    return emitter.on(event, handler);
  }

  emit<T extends TookeyWeb3EventKey>(event: T, payload: TookeyWeb3Events[T]): void {
    return emitter.emit(event, payload);
  }

  private useCredentials({ accessToken }: { accessToken: string }) {
    const createAccessTokenInterceptor = (accessToken: string) => (config: AxiosRequestConfig) => {
      if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
      return config;
    };

    const apiCredentialsInterceptorId = this._client.interceptors.request.use(
      createAccessTokenInterceptor(accessToken),
    );

    this.on('logout', () => {
      this._client.interceptors.request.eject(apiCredentialsInterceptorId);
    });
  }

  async authWithDiscord(credentials: AuthDiscordCredentials): Promise<TookeyWeb3> {
    const response = await this._client.post<AuthTokens>('/api/auth/discord', credentials);
    const accessToken = response.data.access.token;
    this.userRefreshToken = response.data.refresh.token;
    this.useCredentials({ accessToken });
    return this;
  }

  async refreshToken(): Promise<TokenRecord> {
    try {
      if (!this.userRefreshToken) throw new Error('Refresh token not found');

      const response = await this._client.post<TokenRecord>('/api/auth/refresh', undefined, {
        headers: { Authorization: `Bearer ${this.userRefreshToken}` },
      });
      const accessToken = response.data.token;
      this.useCredentials({ accessToken });
      await this.fetchUser();
      return response.data;
    } catch (error) {
      throw new Error('Refresh token failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await this._client.post('/api/auth/logout');
      this._user = undefined;
      this.userRefreshToken = undefined;
      this.emit('logout', null);
    } catch (e) {
      throw new Error('Logout failed');
    }
  }

  async fetchUser(): Promise<User> {
    const { data: user } = await this._client.get<UserWithWallet>('/api/users/me');
    this.user = user;
    return user;
  }

  private get baseURL() {
    return `${this._baseURL}`;
  }

  private openWindow(path?: string): Window | null {
    if (!canUseDom) {
      console.warn(`Wallet Window is only available in the Browser.`);
    }

    const w = 380;
    const h = 720;

    // Check if user has multiple screens first.
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

    const width = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : screen.width;
    const height = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight
      ? document.documentElement.clientHeight
      : screen.height;

    const systemZoom = width / window.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft;
    const top = (height - h) / 2 / systemZoom + dualScreenTop;
    const walletWindow = window.open(
      `${this.baseURL}${path}`,
      '_blank',
      `
      popup=true
      width=${w},
      height=${h},
      top=${top},
      left=${left}`,
    );
    if (!!window.focus && !!walletWindow?.focus) walletWindow.focus();

    return walletWindow;
  }

  getRoomId(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  createWallet(roomId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const popup = this.openWindow(getPath('/auth', { roomId }));
        window.addEventListener('message', async (event) => {
          if (event.origin === this.baseURL) {
            if (popup && event.data === 'close') popup.close();
            resolve();
          }
        });
      } catch (e: any) {
        reject(e.message);
      }
    });
  }

  signTransaction(roomId: string, data: TransactionUnsigned): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const popup = this.openWindow(getPath('/transaction/send', { ...data, roomId }));
        window.addEventListener('message', async (event) => {
          if (event.origin === this.baseURL) {
            if (popup && event.data === 'close') popup.close();
            resolve();
          }
        });
      } catch (e: any) {
        reject(e.message);
      }
    });
  }

  async getTokens() {
    //
  }

  async getTransactions() {
    //
  }
}
