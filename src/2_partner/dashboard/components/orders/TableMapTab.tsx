import React from 'react';
import { motion } from 'framer-motion';
import { Users, Receipt, Clock, Trash2, PlusCircle, ShoppingBag } from 'lucide-react';

interface TableMapTabProps {
  tableSessions: any[];
  restaurantTables: any[];
  fmt: (n: number) => string;
  onSelectTable: (table: string) => void;
  onCloseSession?: (table: string) => void;
}

const TableMapTab: React.FC<TableMapTabProps> = ({ tableSessions = [], restaurantTables = [], fmt, onSelectTable, onCloseSession }) => {
  // Use restaurantTables from QR builder. If empty, fallback to a sensible default or show empty.
  const tables = restaurantTables && restaurantTables.length > 0 
    ? restaurantTables.map(t => t?.table_number?.toString() || '').filter(Boolean)
    : [];

  const getSessionForTable = (num: string) => {
    if (!tableSessions || !Array.isArray(tableSessions)) return null;
    const sessions = tableSessions.filter(s => s?.table_number === num);
    if (sessions.length === 0) return null;
    
    return {
        total: sessions.reduce((sum, s) => sum + (s?.total_amount || 0), 0),
        since: sessions[0]?.created_at,
        orderCount: sessions.length
    };
  };

  const externalOrders = tableSessions?.filter(s => s?.order_type !== 'DINE_IN') || [];
  const externalSession = externalOrders.length > 0 ? {
    total: externalOrders.reduce((sum, s) => sum + (s?.total_amount || 0), 0),
    orderCount: externalOrders.length
  } : null;

  const occupiedCount = tables.filter(t => getSessionForTable(t)).length + (externalSession ? 1 : 0);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center bg-black/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.25rem] bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Users className="text-orange-500 w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Live Floor Status</h3>
            <p className="text-slate-500 text-sm font-medium tracking-wide">Real-time occupancy and billing overview</p>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center gap-10 mt-6 md:mt-0">
          <div className="text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Active Sessions</p>
            <p className="text-3xl font-black text-white">{occupiedCount} <span className="text-slate-600 text-lg">/ {tables.length}</span></p>
          </div>
          <div className="h-10 w-px bg-white/5" />
          <div className="text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Floor Occupancy</p>
            <p className="text-3xl font-black text-orange-500">{tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0}%</p>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {tables.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {/* External/Takeaway Orders Card */}
            {externalSession && (
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative group h-52 rounded-[2rem] border bg-gradient-to-br from-blue-500/20 to-indigo-600/5 border-blue-500/40 shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)]"
              >
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="text-4xl font-black text-white">EXT</div>
                      <div className="flex flex-col gap-1 items-end">
                             <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg">
                                Live
                            </span>
                            <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                                <ShoppingBag size={10} />
                                {externalSession.orderCount} Orders
                            </span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-black/40 backdrop-blur-md rounded-2xl py-2 px-3 border border-white/5">
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Takeaway/Del</p>
                            <p className="text-xl font-black text-blue-400">{fmt(externalSession.total)}</p>
                        </div>
                        <button 
                            onClick={() => onSelectTable('')}
                            className="w-full bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2"
                        >
                            <PlusCircle size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">New Order</span>
                        </button>
                    </div>
                  </div>
              </motion.div>
            )}

            {tables.map((num) => {
              const session = getSessionForTable(num);
              const isOccupied = !!session;

              return (
                <motion.div
                  key={num}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative group cursor-pointer h-52 rounded-[2rem] border transition-all duration-300 ${
                    isOccupied 
                      ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/5 border-orange-500/40 shadow-[0_20px_40px_-15px_rgba(244,175,37,0.2)]' 
                      : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  {/* Table Body */}
                  <div 
                    className="absolute inset-0 p-6 flex flex-col justify-between"
                    onClick={() => !isOccupied && onSelectTable(num)}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`text-4xl font-black ${isOccupied ? 'text-white' : 'text-slate-700 group-hover:text-slate-500'}`}>
                        {num}
                      </div>
                      {isOccupied && (
                        <div className="flex flex-col gap-1 items-end">
                             <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                Live
                            </span>
                            <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                                <Clock size={10} />
                                {session.orderCount} Orders
                            </span>
                        </div>
                      )}
                    </div>

                    {isOccupied ? (
                      <div className="space-y-3">
                        <div className="bg-black/40 backdrop-blur-md rounded-2xl py-2 px-3 border border-white/5">
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Total Bill</p>
                            <p className="text-xl font-black text-orange-400">{fmt(session.total)}</p>
                        </div>
                        
                        {/* Actions Overlay */}
                        <div className="flex gap-2">
                            <button 
                                aria-label={`View bill for table ${num}`}
                                onClick={(e) => { e.stopPropagation(); onSelectTable(num); }}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-all border border-white/5 flex items-center justify-center"
                            >
                                <Receipt size={16} />
                            </button>
                            <button 
                                aria-label={`Close session for table ${num}`}
                                onClick={(e) => { e.stopPropagation(); onCloseSession?.(num); }}
                                className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-500 p-2.5 rounded-xl transition-all border border-red-500/30 flex items-center justify-center group/close relative"
                                title="Close session & clear table"
                            >
                                <Trash2 size={16} />
                                <span className="absolute -top-10 scale-0 group-hover/close:scale-100 bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold transition-all whitespace-nowrap">Close Bill</span>
                            </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity h-full">
                        <PlusCircle size={32} className="text-slate-600 mb-2" />
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Open Tab</span>
                      </div>
                    )}
                  </div>

                  {/* Status Glow */}
                  {isOccupied && (
                    <div className="absolute -bottom-1 left-4 right-4 h-1 rounded-full blur-sm bg-orange-500/50"></div>
                  )}
                </motion.div>
              );
            })}
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
