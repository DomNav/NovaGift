import {
  TransactionBuilder,
  Operation,
  Asset,
  Keypair,
  Networks,
  Memo,
} from '@stellar/stellar-sdk';
import { env } from '../config/env';
import { AssetRef, assetToStellar, assetToString } from './assets';
import { findStrictReceivePaths } from './horizon';

export interface DexQuote {
  inAmount: string;
  outAmount: string;
  price: number;
  path: AssetRef[];
}

export async function quoteDexExactOut(
  fromAsset: AssetRef,
  toAsset: AssetRef,
  exactOutAmount: string
): Promise<DexQuote | null> {
  try {
    const sourceAssets = [assetToString(fromAsset)];
    const destAsset = assetToStellar(toAsset);
    
    const paths = await findStrictReceivePaths(
      sourceAssets,
      destAsset.isNative() ? 'native' : destAsset.getCode(),
      destAsset.isNative() ? undefined : destAsset.getCode(),
      destAsset.isNative() ? undefined : destAsset.getIssuer(),
      exactOutAmount
    );
    
    if (paths.length === 0) {
      return null;
    }
    
    const bestPath = paths[0];
    const inAmount = bestPath.source_amount;
    const outAmount = exactOutAmount;
    const price = parseFloat(outAmount) / parseFloat(inAmount);
    
    const path: AssetRef[] = bestPath.path.map(asset => {
      if (asset.asset_type === 'native') {
        return { code: 'XLM' };
      }
      return {
        code: asset.asset_code!,
        issuer: asset.asset_issuer!,
      };
    });
    
    return {
      inAmount,
      outAmount,
      price,
      path,
    };
  } catch (error) {
    console.error('DEX quote error:', error);
    return null;
  }
}

export function buildPathPaymentStrictReceiveXdr(
  sourcePublicKey: string,
  fromAsset: AssetRef,
  toAsset: AssetRef,
  destAmount: string,
  sendMax: string,
  path: AssetRef[],
  memo?: string
): string {
  const sourceKeypair = Keypair.fromPublicKey(sourcePublicKey);
  const account = {
    accountId: () => sourcePublicKey,
    sequenceNumber: () => '0',
    incrementSequenceNumber: () => {},
  };
  
  const builder = new TransactionBuilder(account as any, {
    fee: '10000',
    networkPassphrase: env.NETWORK_PASSPHRASE,
  });
  
  if (memo) {
    builder.addMemo(Memo.text(memo));
  }
  
  const pathAssets = path.map(asset => assetToStellar(asset));
  
  builder.addOperation(
    Operation.pathPaymentStrictReceive({
      sendAsset: assetToStellar(fromAsset),
      sendMax,
      destination: sourcePublicKey,
      destAsset: assetToStellar(toAsset),
      destAmount,
      path: pathAssets,
    })
  );
  
  builder.setTimeout(300);
  
  const transaction = builder.build();
  return transaction.toXDR();
}

export function buildChangeTrustXdr(
  sourcePublicKey: string,
  asset: AssetRef,
  limit?: string
): string {
  const sourceKeypair = Keypair.fromPublicKey(sourcePublicKey);
  const account = {
    accountId: () => sourcePublicKey,
    sequenceNumber: () => '0',
    incrementSequenceNumber: () => {},
  };
  
  const builder = new TransactionBuilder(account as any, {
    fee: '10000',
    networkPassphrase: env.NETWORK_PASSPHRASE,
  });
  
  builder.addOperation(
    Operation.changeTrust({
      asset: assetToStellar(asset),
      limit: limit || '1000000',
    })
  );
  
  builder.setTimeout(300);
  
  const transaction = builder.build();
  return transaction.toXDR();
}