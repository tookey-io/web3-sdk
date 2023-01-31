import joi from 'joi';

import { TookeyWeb3Options } from '../types/instance.type';

export const clientOptionsSchema = joi.object<TookeyWeb3Options>({
  baseURL: joi.string().optional().error(new Error('`baseURL` should be a string.')),
});
