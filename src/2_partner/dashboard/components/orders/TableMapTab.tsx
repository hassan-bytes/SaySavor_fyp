import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Receipt, Clock, Trash2, PlusCircle, ShoppingBag, TrendingUp, DollarSign, Timer, ChevronDown, ChevronUp } from 'lucide-react';
import { TableSession } from '../../services/tableSessionService';

interface TableMapTabProps {
  tableSessions: any[];
  restaurantTables: any[];
  fmt: (n: number) => string;
  onSelectTable: (table: string) => void;
  onCloseSession?: (table: string) => void;
}

const TableMapTab: React.FC<TableMapTabProps> = ({ tableSessions = [], restaurantTables = [], fmt, onSelectTable, onCloseSession }) => {
  // Internal type safety - cast to proper types without changing props interface
  const typedTableSessions = tableSessions as TableSession[];
  const typedRestaurantTables = restaurantTables as any[];
  // Use restaurantTables from QR builder. If empty, fallback to a sensible default or show empty.
  const tables = typedRestaurantTables && typedRestaurantTables.length > 0 
    ? typedRestaurantTables.map(t => t?.table_number?.toString() || '').filter(Boolean)
    : [];

  const getSessionForTable = (num: string) => {
    if (!typedTableSessions || !Array.isArray(typedTableSessions)) return null;
    // FIX: Use .find() instead of .filter() - TableSession is already aggregated by table_number
    const session = typedTableSessions.find(s => s?.table_number === num);
    if (!session) return null;
    
    return {
        total: session.total_amount,
        since: session.created_at,
        orderCount: session.order_count
    };
  };

  // FIX: Access nested orders array - TableSession contains orders[], not order_type directly
  const externalOrders = typedTableSessions?.flatMap(s => 
    s.orders?.filter(o => o.order_type !== 'DINE_IN') || []
  ) || [];
  
  const externalSession = externalOrders.length > 0 ? {
    total: externalOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    orderCount: externalOrders.length
  } : null;

  const occupiedCount = tables.filter(t => getSessionForTable(t)).length + (externalSession ? 1 : 0);

  // Helper: Calculate time since session started
  const getTimeSince = (timestamp: string) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Calculate total revenue from active sessions
  const totalRevenue = typedTableSessions.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  // Organize tables by status
  const occupiedTables = tables.filter(t => getSessionForTable(t));
  const availableTables = tables.filter(t => !getSessionForTable(t));

  // State for collapsing available tables section
  const [showAvailable, setShowAvailable] = useState(false);

  return (
    <div className="space-y-10 pb-20">
      {/* Enhanced Header with Metrics Grid */}
      <div className="bg-black/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl -mr-48 -mt-48" />
        
        {/* Title Section */}
        <div className="relative z-10 flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-[1.25rem] bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Users className="text-orange-500 w-8 h-8" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-tight">Live Floor Status</h3>
            <p className="text-slate-500 text-sm font-medium tracking-wide">Real-time occupancy and billing overview</p>
          </div>
        </div>
        
        {/* Metrics Grid */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Active Sessions */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Active</p>
            </div>
            <p className="text-3xl font-black text-white">{occupiedCount}</p>
            <p className="text-slate-600 text-xs font-bold mt-1">of {tables.length} tables</p>
          </div>

          {/* Floor Occupancy */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Occupancy</p>
            </div>
            <p className="text-3xl font-black text-orange-500">{tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0}%</p>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
              <div 
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Total Revenue */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Revenue</p>
            </div>
            <p className="text-2xl font-black text-emerald-400">{fmt(totalRevenue)}</p>
            <p className="text-slate-600 text-xs font-bold mt-1">Active bills</p>
          </div>

          {/* External Orders */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">External</p>
            </div>
            <p className="text-3xl font-black text-white">{externalSession ? externalSession.orderCount : 0}</p>
            <p className="text-slate-600 text-xs font-bold mt-1">Takeaway/Delivery</p>
          </div>
        </div>
      </div>

      {/* Tables Grid - Section Based */}
      {tables.length > 0 ? (
        <div className="space-y-10">
          {/* Section 1: External Orders (if any) */}
          {externalSession && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">Takeaway & Delivery</h4>
                  <p className="text-xs text-slate-500 font-medium">External orders</p>
                </div>
                <div className="ml-auto px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30">
                  <span className="text-sm font-black text-blue-400">{externalSession.orderCount}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                <motion.div
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="relative group h-56 rounded-[2rem] border bg-gradient-to-br from-blue-500/20 to-indigo-600/5 border-blue-500/40 shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)]"
                >
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="text-5xl font-black text-white">EXT</div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          Live
                        </span>
                        <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                          <ShoppingBag size={10} />
                          {externalSession.orderCount} Orders
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-black/40 backdrop-blur-md rounded-2xl py-3 px-4 border border-white/5">
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-2xl font-black text-blue-400">{fmt(externalSession.total)}</p>
                      </div>
                      <button 
                        onClick={() => onSelectTable('')}
                        className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 p-3 rounded-xl transition-all border border-blue-500/30 flex items-center justify-center gap-2 font-bold"
                      >
                        <PlusCircle size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">New Order</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {/* Section 2: Occupied Tables */}
          {occupiedTables.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                  <Users className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">Active Tables</h4>
                  <p className="text-xs text-slate-500 font-medium">Currently serving</p>
                </div>
                <div className="ml-auto px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30">
                  <span className="text-sm font-black text-orange-400">{occupiedTables.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">

                {occupiedTables.map((num) => {
                  const session = getSessionForTable(num)!;
                  const duration = getTimeSince(session.since);

                  return (
                    <motion.div
                      key={num}
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative group cursor-pointer h-56 rounded-[2rem] border bg-gradient-to-br from-orange-500/20 to-orange-600/5 border-orange-500/40 shadow-[0_20px_40px_-15px_rgba(244,175,37,0.2)] transition-all duration-300"
                    >
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                          <div className="text-5xl font-black text-white">{num}</div>
                          <div className="flex flex-col gap-1.5 items-end">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              Live
                            </span>
                            <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                              <Timer size={10} />
                              {duration}
                            </span>
                            <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                              <Receipt size={10} />
                              {session.orderCount} {session.orderCount === 1 ? 'Order' : 'Orders'}
                            </span>
                          </div>
                        </div>

                        {/* Bill Info */}
                        <div className="space-y-3">
                          <div className="bg-black/40 backdrop-blur-md rounded-2xl py-3 px-4 border border-white/5">
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Total Bill</p>
                            <p className="text-2xl font-black text-orange-400">{fmt(session.total)}</p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2">
                            <button 
                              aria-label={`View bill for table ${num}`}
                              onClick={(e) => { e.stopPropagation(); onSelectTable(num); }}
                              className="flex-1 bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 font-bold"
                            >
                              <Receipt size={16} />
                              <span className="text-[10px] font-black uppercase tracking-widest">View</span>
                            </button>
                            <button 
                              aria-label={`Close session for table ${num}`}
                              onClick={(e) => { e.stopPropagation(); onCloseSession?.(num); }}
                              className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 p-3 rounded-xl transition-all border border-red-500/30 flex items-center justify-center group/close relative font-bold"
                              title="Close session & clear table"
                            >
                              <Trash2 size={16} />
                              <span className="absolute -top-10 scale-0 group-hover/close:scale-100 bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold transition-all whitespace-nowrap">Close Bill</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Status Glow */}
                      <div className="absolute -bottom-1 left-4 right-4 h-1 rounded-full blur-sm bg-orange-500/50"></div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Available Tables (Collapsible) */}
          {availableTables.length > 0 && (
            <div>
              <button
                onClick={() => setShowAvailable(!showAvailable)}
                className="w-full flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700/20 flex items-center justify-center border border-slate-700/30">
                  {showAvailable ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-xl font-black text-slate-400 uppercase tracking-tight">Available Tables</h4>
                  <p className="text-xs text-slate-600 font-medium">Ready for new customers</p>
                </div>
                <div className="px-4 py-2 rounded-full bg-slate-700/20 border border-slate-700/30">
                  <span className="text-sm font-black text-slate-500">{availableTables.length}</span>
                </div>
              </button>
              
              {showAvailable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4"
                >
                  {availableTables.map((num) => (
                    <motion.div
                      key={num}
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSelectTable(num)}
                      className="relative group cursor-pointer h-32 rounded-2xl border bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-300"
                    >
                      <div className="absolute inset-0 p-4 flex flex-col items-center justify-center">
                        <div className="text-3xl font-black text-slate-700 group-hover:text-slate-500 transition-colors mb-2">
                          {num}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlusCircle size={20} className="text-slate-600 mb-1" />
                          <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Open</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="dash-glass-panel rounded-[3rem] border border-white/5 p-20 text-center bg-black/40 backdrop-blur-3xl">
            <div className="w-24 h-24 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/5">
                <ShoppingBag size={40} className="text-slate-600" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">No Tables Configured</h2>
            <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed mb-8">
                Go to the QR Builder to create and configure your restaurant tables first.
            </p>
        </div>
      )}
    </div>
  );
};

export default TableMapTab;
