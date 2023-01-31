export interface User {
  id: number;
  wallet?: Wallet;
}

export interface Wallet {
  eth_address: string;
}

export interface UserWithWallet extends User {
  wallet: Wallet;
}
