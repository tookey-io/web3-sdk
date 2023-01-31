import mitt from 'mitt';

import { TookeyWeb3Events } from '../types/instance.type';

export const emitter = mitt<TookeyWeb3Events>();
