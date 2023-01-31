export interface TookeyWeb3Options {
  baseURL: string;
}

export type TookeyWeb3Events = {
  login: unknown;
  logout: unknown;
};

export type TookeyWeb3EventKey = keyof TookeyWeb3Events;
