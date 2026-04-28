import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Square, Loader2, X, Radio, ShoppingCart, Navigation, MessageCircle, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerJarvis, type JarvisAction } from './useCustomerJarvis';
import { useCustomerActionHandler } from './CustomerActionHandler';
import { useCustomerAuth } from '@/3_customer/context/CustomerAuthContext';
import { useCart } from '@/3_customer/context/CartContext';
import { useCustomerLocation } from '@/3_customer/hooks/useCustomerLocation';

interface CustomerJarvisButtonProps {
  restaurantId?: string;
}

interface ResultItem {
  id?: string;
  name: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  category?: string;
  offer_name?: string;
  is_available?: boolean;
  restaurant_id?: string;
}

export default function CustomerJarvisButton({ restaurantId = '' }: CustomerJarvisButtonProps) {
  const { userId } = useCustomerAuth();
  const { addToCart } = useCart();
  const { location } = useCustomerLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [resultItems, setResultItems] = useState<ResultItem[]>([]);
  const [resultTitle, setResultTitle] = useState('');
  const [resultsExpanded, setResultsExpanded] = useState(true);

  const {
    isRecording, isProcessing, isAutoMode,
    transcript, error, lastData,
    startRecording, stopRecording, toggleAutoMode,
  } = useCustomerJarvis({
    restaurantId,
    userId: userId || '',
    userLat: location?.latitude ?? null,
    userLng: location?.longitude ?? null,
  });

  const { executeAction } = useCustomerActionHandler();

  const handledRef = useRef<string | null>(null);

  // Fire when either new actions[] array OR old flat action field is present
  const actionKey = useMemo(() => {
    if (!lastData) return null;
    const hasAny = (lastData.actions?.length ?? 0) > 0 || lastData.action;
    return hasAny ? `${lastData.reply ?? ''}:${Date.now()}` : null;
  }, [lastData]);

  // Execute all actions (supports new actions[] array and old flat {action,target})
  useEffect(() => {
    if (!lastData || !actionKey) return;
    if (handledRef.current === actionKey) return;
    handledRef.current = actionKey;

    const toRun: JarvisAction[] = lastData.actions?.length
      ? lastData.actions
      : lastData.action
      ? [{ action: lastData.action, target: lastData.target ?? '', params: {}, tool_result: lastData.tool_result }]
      : [];

    for (const act of toRun) {
      executeAction(act.action, act.target, act.tool_result ?? lastData.tool_result);
    }
  }, [actionKey, executeAction, lastData]);

  // Extract visual result items from tool data (deals / search / budget)
  useEffect(() => {
    if (!lastData) { setResultItems([]); return; }

    const allActions: Array<Partial<JarvisAction>> = lastData.actions?.length
      ? lastData.actions
      : lastData.action
      ? [{ action: lastData.action, tool_result: lastData.tool_result }]
      : [{ action: '', tool_result: lastData.tool_result }];

    for (const act of allActions) {
      const tr = (act.tool_result ?? lastData.tool_result) as Record<string, unknown> | undefined;
      const data = tr?.data as Record<string, unknown> | undefined;
      if (!data) continue;

      const signal = tr?.signal as string | undefined;
      const action = (act.action ?? '').toUpperCase();

      if (signal === 'SHOW_DEALS' || action === 'GET_DEALS') {
        const deals = (data.deals as ResultItem[]) ?? [];
        if (deals.length) { setResultItems(deals); setResultTitle('Best Deals'); return; }
      }
      if (signal === 'SEARCH_MENU' || action === 'SEARCH_MENU') {
        const items = (data.items as ResultItem[]) ?? [];
        if (items.length) {
          setResultTitle(`"${data.query as string}" results`);
          setResultItems(items);
          return;
        }
      }
      if (signal === 'BUDGET_SUGGEST' || action === 'BUDGET_SUGGEST') {
        const suggestions = (data.suggestions as ResultItem[]) ?? [];
        if (suggestions.length) {
          setResultTitle(`Budget Rs.${data.budget}`);
          setResultItems(suggestions);
          return;
        }
      }
    }
    setResultItems([]);
  }, [lastData]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Auto-open the panel and expand results when new results arrive
  useEffect(() => {
    if (resultItems.length > 0) {
      setIsOpen(true);
      setResultsExpanded(true);
    }
  }, [resultItems]);

  // Clear result cards when a new recording starts
  useEffect(() => {
    if (isRecording) setResultItems([]);
  }, [isRecording]);

  const handleMicClick = async () => {
    if (isAutoMode || isProcessing) return;
    if (isRecording) { stopRecording(); return; }
    await startRecording();
  };

  const actionIcon = () => {
    const act = (lastData?.action || (lastData?.actions?.[0]?.action ?? '')).toUpperCase();
    if (act.includes('CART')) return <ShoppingCart className="h-3 w-3" />;
    if (act === 'NAVIGATE' || act.includes('SEARCH') || act.includes('NEARBY')) return <Navigation className="h-3 w-3" />;
    if (act.includes('DEAL') || act.includes('BUDGET')) return <Tag className="h-3 w-3" />;
    return <MessageCircle className="h-3 w-3" />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Mini panel — shown when open */}
      {isOpen && (
        <div className="w-80 rounded-2xl border border-white/20 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-lg space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-300">Jarvis — Food Assistant</span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status */}
          <div className={`rounded-xl px-3 py-2 text-xs ${
            isRecording ? 'bg-red-500/20 text-red-300' :
            isProcessing ? 'bg-amber-500/20 text-amber-300' :
            isAutoMode ? 'bg-green-500/20 text-green-300' :
            'bg-white/10 text-slate-300'
          }`}>
            {isRecording && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />}
            {isProcessing ? 'Soch raha hai...' : isRecording ? 'Sun raha hai...' : isAutoMode ? 'Auto mode on...' : 'Ready — bolein!'}
          </div>

          {/* Last reply */}
          {transcript && (
            <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300 flex gap-2">
              {actionIcon()}
              <span>{transcript}</span>
            </div>
          )}

          {/* Result item cards — deals / search / budget suggestions */}
          {resultItems.length > 0 && (
            <div className="space-y-1.5">
              <button
                onClick={() => setResultsExpanded(p => !p)}
                className="flex w-full items-center justify-between text-[10px] text-amber-400/80 uppercase tracking-wider hover:text-amber-300 transition-colors"
              >
                <span>{resultTitle} ({resultItems.length})</span>
                <span className="text-amber-400/60">{resultsExpanded ? '▲ hide' : '▼ show'}</span>
              </button>
              {resultsExpanded && (
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {resultItems.slice(0, 10).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-white truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-bold text-amber-400">Rs.{item.price}</span>
                          {item.original_price && item.original_price !== item.price && (
                            <span className="text-[9px] text-slate-500 line-through">Rs.{item.original_price}</span>
                          )}
                          {(item.discount_percentage ?? 0) > 0 && (
                            <span className="text-[9px] px-1 rounded bg-green-500/20 text-green-400">
                              {Math.round(item.discount_percentage!)}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          addToCart({
                            menuItem: {
                              id: item.id ?? '',
                              name: item.name,
                              price: item.price,
                              category: item.category ?? '',
                              restaurant_id: item.restaurant_id ?? restaurantId,
                            },
                            quantity: 1,
                            selectedVariant: null,
                            selectedModifiers: [],
                          });
                          toast.success(`${item.name} cart mein add ho gaya!`);
                        }}
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/80 hover:bg-amber-500 text-white transition-colors"
                      >
                        <ShoppingCart className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {resultItems.length > 10 && (
                    <p className="text-[10px] text-slate-500 text-center">+{resultItems.length - 10} more items</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {/* Manual mic */}
            {!isAutoMode && (
              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
                  isRecording
                    ? 'bg-red-500/30 text-red-300 border border-red-400/30'
                    : 'bg-amber-400/20 text-amber-200 border border-amber-400/30 hover:bg-amber-400/30'
                } disabled:opacity-50`}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> :
                 isRecording ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {isProcessing ? 'Processing' : isRecording ? 'Stop' : 'Speak'}
              </button>
            )}

            {/* Auto mode toggle */}
            <button
              onClick={toggleAutoMode}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition ${
                isAutoMode
                  ? 'bg-green-500/30 text-green-300 border-green-400/30 animate-pulse'
                  : 'bg-white/10 text-slate-300 border-white/20 hover:bg-white/20'
              }`}
            >
              <Radio className="h-3 w-3" />
              {isAutoMode ? 'Auto ON' : 'Auto OFF'}
            </button>
          </div>

          {/* Quick commands */}
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Quick Commands</p>
            {[
              'Best deals dikhao',
              'Pizza dhundo',
              '500 mein kya mil sakta hai?',
              'Biryani cart mein add karo',
            ].map((cmd) => (
              <p key={cmd} className="text-[11px] text-slate-400 rounded px-2 py-1 bg-white/5">
                "{cmd}"
              </p>
            ))}
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all ${
          isRecording
            ? 'bg-red-500 animate-pulse shadow-red-500/50'
            : isProcessing
            ? 'bg-amber-500 shadow-amber-500/50'
            : isAutoMode
            ? 'bg-green-500 shadow-green-500/50 animate-pulse'
            : 'bg-gradient-to-br from-amber-400 to-orange-500 hover:scale-110 shadow-orange-500/40'
        }`}
        aria-label="Jarvis voice assistant"
      >
        {isProcessing ? (
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        ) : isRecording ? (
          <Square className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}
