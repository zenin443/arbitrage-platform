'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { CheckCircle, X, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { CHAINS, CHAIN_ORDER, PLAN_PRICES, ERC20_TRANSFER_ABI, PAYMENT_WALLET_ADDRESS, SOLANA_PAYMENT_WALLET } from '@/lib/payments/config';

interface PaymentModalProps {
  plan: 'trader' | 'pro' | 'institutional';
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string | null;
}

type PaymentStatus = 'idle' | 'creating' | 'switching-network' | 'awaiting-wallet' | 'awaiting-confirm' | 'confirming-server' | 'success' | 'error';

const PLAN_LABELS: Record<string, string> = {
  trader: 'Trader',
  pro: 'Pro',
  institutional: 'Institutional',
};

const CHAIN_ID_MAP: Record<number, string> = {
  8453: 'base',
  137: 'polygon',
  42161: 'arbitrum',
  1: 'ethereum',
  56: 'bsc',
};

function truncateTx(hash: string, len = 12): string {
  if (!hash) return '';
  return `${hash.slice(0, len)}...${hash.slice(-6)}`;
}

export default function PaymentModal({ plan, onClose, onSuccess, accessToken }: PaymentModalProps) {
  const [selectedChain, setSelectedChain] = useState<string>('base');
  const [selectedCurrency, setSelectedCurrency] = useState<'USDC' | 'USDT'>('USDC');
  const [activeTab, setActiveTab] = useState<'wallet' | 'exchange'>('wallet');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenContract, setTokenContract] = useState<`0x${string}` | null>(null);
  const [txHashDisplay, setTxHashDisplay] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [solanaTxInput, setSolanaTxInput] = useState('');
  const [copied, setCopied] = useState(false);

  const { address: walletAddress, chainId: connectedChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  const chainConfig = CHAINS[selectedChain];
  const isSolana = selectedChain === 'solana';
  const amount = PLAN_PRICES[plan];

  // Auto-switch to Wallet tab if Solana selected
  useEffect(() => {
    if (isSolana) setActiveTab('wallet');
  }, [isSolana]);

  // Currency guard — Base doesn't have USDT
  useEffect(() => {
    if (selectedChain === 'base' && selectedCurrency === 'USDT') {
      setSelectedCurrency('USDC');
    }
  }, [selectedChain, selectedCurrency]);

  // When EVM tx is confirmed on-chain, call server to confirm
  useEffect(() => {
    if (isTxConfirmed && pendingTxHash && paymentId) {
      setStatus('confirming-server');
      confirmPaymentOnServer(pendingTxHash, walletAddress || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTxConfirmed]);

  useEffect(() => {
    if (isTxConfirming && status !== 'awaiting-confirm') {
      setStatus('awaiting-confirm');
    }
  }, [isTxConfirming, status]);

  async function createPaymentRecord(): Promise<{ paymentId: string; recipient: string; contract: `0x${string}` | null; explorer: string } | null> {
    setStatus('creating');
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ plan, chain: selectedChain, currency: selectedCurrency, paymentMethod: 'wallet' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');

      setPaymentId(data.paymentId);
      setRecipientAddress(data.recipientAddress);
      setTokenContract(data.tokenContract as `0x${string}` | null);
      setExplorerUrl(data.explorerUrl);
      return {
        paymentId: data.paymentId,
        recipient: data.recipientAddress,
        contract: data.tokenContract as `0x${string}` | null,
        explorer: data.explorerUrl,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create payment record';
      setErrorMsg(msg);
      setStatus('error');
      return null;
    }
  }

  async function confirmPaymentOnServer(txHash: string, from: string) {
    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ paymentId, txHash, fromAddress: from }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Confirmation failed');
      setTxHashDisplay(txHash);
      setStatus('success');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Server confirmation failed';
      setErrorMsg(msg);
      setStatus('error');
    }
  }

  const handleEvmPay = useCallback(async () => {
    if (!walletAddress) {
      setErrorMsg('Please connect your wallet first.');
      setStatus('error');
      return;
    }

    setErrorMsg('');
    const payment = await createPaymentRecord();
    if (!payment) return;

    const targetChainId = chainConfig.chainId!;

    // Switch chain if needed
    if (connectedChainId !== targetChainId) {
      setStatus('switching-network');
      try {
        await switchChainAsync({ chainId: targetChainId });
      } catch {
        setErrorMsg(`Failed to switch to ${chainConfig.name}. Switch manually in your wallet.`);
        setStatus('error');
        return;
      }
    }

    setStatus('awaiting-wallet');

    try {
      const amountUnits = parseUnits(amount.toFixed(2), 6); // USDC/USDT = 6 decimals
      const hash = await writeContractAsync({
        address: payment.contract as `0x${string}`,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [payment.recipient as `0x${string}`, amountUnits],
        chainId: targetChainId,
      });

      setPendingTxHash(hash);
      setStatus('awaiting-confirm');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied')) {
        setErrorMsg('Transaction rejected.');
      } else {
        setErrorMsg(msg.slice(0, 120));
      }
      setStatus('error');
    }
  }, [walletAddress, connectedChainId, chainConfig, amount, switchChainAsync, writeContractAsync, createPaymentRecord]);

  const handleSolanaVerify = async () => {
    if (!solanaTxInput.trim()) {
      setErrorMsg('Please paste your transaction hash.');
      return;
    }
    setErrorMsg('');
    const payment = await createPaymentRecord();
    if (!payment) return;
    setStatus('confirming-server');
    await confirmPaymentOnServer(solanaTxInput.trim(), '');
  };

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setStatus('idle');
    setErrorMsg('');
    setPaymentId(null);
    setSolanaTxInput('');
    setPendingTxHash(undefined);
  }

  const isProcessing = ['creating', 'switching-network', 'awaiting-wallet', 'awaiting-confirm', 'confirming-server'].includes(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0D1117] border border-[#21262D] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#21262D] bg-[#161B22]">
          <div>
            <h2 className="text-[13px] font-mono font-semibold uppercase tracking-widest text-[#E6EDF3]">
              Upgrade to {PLAN_LABELS[plan]}
            </h2>
            <p className="text-[11px] font-mono text-[#484F58] mt-0.5">
              ${amount.toFixed(2)} / month
            </p>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="text-[#484F58] hover:text-[#8B949E] transition-colors disabled:opacity-30">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Success State */}
          {status === 'success' && (
            <div className="text-center py-6 space-y-3">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-[#3FB950]" />
              </div>
              <div>
                <p className="text-[14px] font-mono font-semibold text-[#3FB950]">Plan active!</p>
                <p className="text-[11px] font-mono text-[#8B949E] mt-1">
                  Your {PLAN_LABELS[plan]} subscription is now active.
                </p>
              </div>
              {txHashDisplay && explorerUrl && (
                <a
                  href={`${explorerUrl}/tx/${txHashDisplay}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#388BFD] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {truncateTx(txHashDisplay)}
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full mt-2 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[12px] font-mono font-semibold uppercase tracking-wider transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {status !== 'success' && (
            <>
              {/* Chain Selector */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#484F58] mb-2">Network</p>
                <div className="flex flex-wrap gap-1.5">
                  {CHAIN_ORDER.map((key) => {
                    const c = CHAINS[key];
                    const active = selectedChain === key;
                    return (
                      <button
                        key={key}
                        onClick={() => { setSelectedChain(key); reset(); }}
                        disabled={isProcessing}
                        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border transition-colors disabled:opacity-50 ${
                          active
                            ? 'bg-[#238636]/20 border-[#238636]/60 text-[#3FB950]'
                            : 'bg-[#161B22] border-[#21262D] text-[#8B949E] hover:border-[#388BFD]/40 hover:text-[#C9D1D9]'
                        }`}
                      >
                        {c.recommended && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#3FB950] flex-shrink-0" />
                        )}
                        {c.name}
                        {c.recommended && (
                          <span className="text-[9px] text-[#3FB950] font-mono">★</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {chainConfig.recommended && (
                  <p className="text-[10px] font-mono text-[#3FB950]/70 mt-1">Base recommended — lowest fees</p>
                )}
              </div>

              {/* Currency Toggle (hide for Solana since USDT contract is different) */}
              {!isSolana && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#484F58] mb-2">Currency</p>
                  <div className="flex gap-1.5">
                    {(['USDC', 'USDT'] as const).map((cur) => {
                      const unavailable = cur === 'USDT' && !chainConfig.usdtContract;
                      return (
                        <button
                          key={cur}
                          onClick={() => !unavailable && setSelectedCurrency(cur)}
                          disabled={unavailable || isProcessing}
                          className={`px-4 py-1.5 rounded text-[11px] font-mono border transition-colors ${
                            selectedCurrency === cur
                              ? 'bg-[#388BFD]/20 border-[#388BFD]/60 text-[#388BFD]'
                              : unavailable
                              ? 'bg-[#161B22] border-[#21262D] text-[#30363D] cursor-not-allowed'
                              : 'bg-[#161B22] border-[#21262D] text-[#8B949E] hover:border-[#388BFD]/40 hover:text-[#C9D1D9]'
                          }`}
                        >
                          {cur}
                          {unavailable && <span className="ml-1 text-[9px]">N/A</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tabs (only EVM chains show Exchange tab) */}
              {!isSolana && (
                <div className="flex border-b border-[#21262D]">
                  {(['wallet', 'exchange'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      disabled={isProcessing}
                      className={`px-4 py-2 text-[11px] font-mono uppercase tracking-wider border-b-2 transition-colors -mb-px ${
                        activeTab === tab
                          ? 'border-[#388BFD] text-[#388BFD]'
                          : 'border-transparent text-[#484F58] hover:text-[#8B949E]'
                      }`}
                    >
                      {tab === 'wallet' ? 'Wallet (EVM)' : 'Exchange Pay'}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Tab A: EVM Wallet ── */}
              {(activeTab === 'wallet' && !isSolana) && (
                <div className="space-y-3">
                  <div className="bg-[#161B22] border border-[#21262D] rounded p-3 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-[#484F58]">Amount</span>
                      <span className="text-[#E6EDF3]">{amount.toFixed(2)} {selectedCurrency}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-[#484F58]">Network</span>
                      <span className="text-[#E6EDF3]">{chainConfig.name}</span>
                    </div>
                    {walletAddress && (
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-[#484F58]">From</span>
                        <span className="text-[#C9D1D9]">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
                      </div>
                    )}
                  </div>

                  {!walletAddress && (
                    <p className="text-[11px] font-mono text-[#D29922] bg-[#D29922]/10 border border-[#D29922]/30 rounded px-3 py-2">
                      Connect your wallet first (use the Connect Wallet button on the login page or top nav).
                    </p>
                  )}

                  {status === 'error' && errorMsg && (
                    <div className="flex items-start gap-2 text-[11px] font-mono text-[#F85149] bg-[#F85149]/10 border border-[#F85149]/30 rounded px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Status messages */}
                  {status === 'switching-network' && (
                    <p className="text-[11px] font-mono text-[#388BFD] animate-pulse text-center">Switching network…</p>
                  )}
                  {status === 'awaiting-wallet' && (
                    <p className="text-[11px] font-mono text-[#388BFD] animate-pulse text-center">Confirm in wallet…</p>
                  )}
                  {status === 'awaiting-confirm' && (
                    <p className="text-[11px] font-mono text-[#3FB950] animate-pulse text-center">Waiting for confirmation…</p>
                  )}
                  {status === 'confirming-server' && (
                    <p className="text-[11px] font-mono text-[#3FB950] animate-pulse text-center">Activating plan…</p>
                  )}

                  <button
                    onClick={status === 'error' ? reset : handleEvmPay}
                    disabled={isProcessing || !walletAddress}
                    className="w-full py-2.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-[12px] font-mono font-semibold uppercase tracking-wider transition-colors"
                  >
                    {status === 'error' ? 'Retry' : isProcessing ? 'Processing…' : `Pay ${amount.toFixed(2)} ${selectedCurrency}`}
                  </button>
                </div>
              )}

              {/* ── Tab B: Solana ── */}
              {isSolana && (
                <div className="space-y-3">
                  <div className="bg-[#161B22] border border-[#21262D] rounded p-3 space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#484F58]">Send to address</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-[#C9D1D9] break-all">
                        {SOLANA_PAYMENT_WALLET || '(wallet not configured)'}
                      </span>
                      {SOLANA_PAYMENT_WALLET && (
                        <button
                          onClick={() => copyAddress(SOLANA_PAYMENT_WALLET)}
                          className="flex-shrink-0 text-[#484F58] hover:text-[#8B949E] transition-colors"
                          title="Copy address"
                        >
                          {copied ? <CheckCircle className="h-4 w-4 text-[#3FB950]" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    <div className="flex justify-between text-[11px] font-mono border-t border-[#21262D] pt-2">
                      <span className="text-[#484F58]">Amount</span>
                      <span className="text-[#E6EDF3]">{amount.toFixed(2)} USDC</span>
                    </div>
                  </div>

                  <p className="text-[10px] font-mono text-[#484F58]">
                    Send exactly {amount.toFixed(2)} USDC to the address above, then paste your transaction hash below.
                  </p>

                  <input
                    type="text"
                    value={solanaTxInput}
                    onChange={e => setSolanaTxInput(e.target.value)}
                    placeholder="Paste Solana tx hash…"
                    disabled={isProcessing}
                    className="w-full bg-[#161B22] border border-[#21262D] rounded px-3 py-2 text-[12px] font-mono text-[#C9D1D9] placeholder-[#484F58] focus:outline-none focus:border-[#388BFD] transition-colors"
                  />

                  {status === 'error' && errorMsg && (
                    <div className="flex items-start gap-2 text-[11px] font-mono text-[#F85149] bg-[#F85149]/10 border border-[#F85149]/30 rounded px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {status === 'confirming-server' && (
                    <p className="text-[11px] font-mono text-[#3FB950] animate-pulse text-center">Activating plan…</p>
                  )}

                  <button
                    onClick={handleSolanaVerify}
                    disabled={isProcessing || !solanaTxInput.trim()}
                    className="w-full py-2.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-[12px] font-mono font-semibold uppercase tracking-wider transition-colors"
                  >
                    {isProcessing ? 'Verifying…' : 'Verify Payment'}
                  </button>
                </div>
              )}

              {/* ── Tab C: Exchange Pay (Coming Soon) ── */}
              {activeTab === 'exchange' && !isSolana && (
                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-[#484F58] uppercase tracking-widest">Exchange Pay</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Binance Pay', icon: '🟡' },
                      { name: 'Bybit Pay', icon: '🟠' },
                      { name: 'KuCoin Pay', icon: '🟢' },
                    ].map((ex) => (
                      <div
                        key={ex.name}
                        className="bg-[#161B22] border border-[#21262D] rounded-lg p-3 flex flex-col items-center gap-2 opacity-50"
                      >
                        <span className="text-2xl">{ex.icon}</span>
                        <span className="text-[10px] font-mono text-[#8B949E] text-center">{ex.name}</span>
                        <span className="text-[9px] font-mono text-[#484F58] text-center">Coming Soon</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-[#484F58] text-center">
                    Exchange pay coming soon. Use Wallet tab to pay now.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
