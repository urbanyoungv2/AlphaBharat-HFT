import React, { useState } from 'react';
import { ExchangeProfile } from '../types';
import { X, Plus, Globe, Server, Save, Trash2, Link } from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (profile: ExchangeProfile) => void;
  profiles: ExchangeProfile[];
  onSaveProfile: (profile: ExchangeProfile) => void;
  onDeleteProfile: (id: string) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({ 
  isOpen, onClose, onConnect, profiles, onSaveProfile, onDeleteProfile 
}) => {
  const [mode, setMode] = useState<'LIST' | 'ADD'>('LIST');
  const [newProfile, setNewProfile] = useState<Partial<ExchangeProfile>>({
    type: 'CUSTOM',
    name: 'My Custom Feed',
    wsUrl: 'wss://',
    subscriptionMessage: '{"event":"subscribe", "pair":"{{SYMBOL}}", "subscription":{"name":"trade"}}'
  });

  if (!isOpen) return null;

  const handleSave = () => {
    const profile: ExchangeProfile = {
        id: Math.random().toString(36).substring(7),
        name: newProfile.name || 'Unnamed',
        type: newProfile.type || 'CUSTOM',
        providerId: newProfile.providerId,
        wsUrl: newProfile.wsUrl,
        subscriptionMessage: newProfile.subscriptionMessage
    };
    onSaveProfile(profile);
    setMode('LIST');
  };

  return (
    <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-surface-900 border border-surface-800 rounded-xl w-[600px] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden ring-1 ring-white/5">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-surface-800 bg-surface-900">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2.5">
            <Globe size={20} className="text-brand-blue" /> Exchange Connectivity
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md hover:bg-surface-800"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-surface-950/50">
          {mode === 'LIST' ? (
            <div className="space-y-3">
               {profiles.map(p => (
                 <div key={p.id} className="flex items-center justify-between p-4 bg-surface-900 border border-surface-800 rounded-lg hover:border-brand-blue/50 hover:bg-surface-800/50 transition-all group cursor-pointer shadow-sm" onClick={() => { onConnect(p); onClose(); }}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${p.type === 'PRESET' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-trade-warn/10 text-trade-warn'}`}>
                           <Server size={18} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm text-text-primary">{p.name}</div>
                            <div className="text-xs font-mono text-text-secondary mt-0.5 flex items-center gap-1.5">
                                {p.type === 'PRESET' ? <span className="bg-brand-blue/10 text-brand-blue px-1.5 rounded text-[10px] font-bold">PRESET</span> : <span className="bg-trade-warn/10 text-trade-warn px-1.5 rounded text-[10px] font-bold">CUSTOM</span>}
                                <span className="opacity-50 truncate max-w-[200px]">{p.providerId || p.wsUrl}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="opacity-0 group-hover:opacity-100 text-xs font-medium text-brand-blue flex items-center gap-1 transition-opacity">
                            Connect <Link size={12} />
                        </div>
                        {p.type === 'CUSTOM' && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteProfile(p.id); }} 
                                className="p-2 text-text-muted hover:text-trade-down hover:bg-trade-down/10 rounded-md transition-colors"
                             >
                                <Trash2 size={16} />
                             </button>
                        )}
                    </div>
                 </div>
               ))}
               
               <button 
                 onClick={() => setMode('ADD')}
                 className="w-full py-4 border border-dashed border-surface-700 text-text-secondary rounded-lg hover:border-text-muted hover:text-text-primary hover:bg-surface-900/50 transition-all flex items-center justify-center gap-2 text-sm font-medium mt-4"
               >
                 <Plus size={16} /> Configure New Endpoint
               </button>
            </div>
          ) : (
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Display Name</label>
                    <input 
                        className="w-full bg-surface-950 border border-surface-800 rounded-md p-2.5 text-sm text-text-primary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                        value={newProfile.name}
                        onChange={e => setNewProfile({...newProfile, name: e.target.value})}
                        placeholder="e.g. Kraken Futures"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">WebSocket Endpoint (wss://)</label>
                    <input 
                        className="w-full bg-surface-950 border border-surface-800 rounded-md p-2.5 text-sm text-trade-warn font-mono focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                        value={newProfile.wsUrl}
                        placeholder="wss://ws.kraken.com"
                        onChange={e => setNewProfile({...newProfile, wsUrl: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Subscription Payload</label>
                    <div className="relative">
                        <textarea 
                            className="w-full h-32 bg-surface-950 border border-surface-800 rounded-md p-3 text-xs text-text-primary font-mono focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all resize-none"
                            value={newProfile.subscriptionMessage}
                            onChange={e => setNewProfile({...newProfile, subscriptionMessage: e.target.value})}
                        />
                        <div className="absolute bottom-2 right-2 text-[10px] text-text-muted bg-surface-900 px-2 py-1 rounded border border-surface-800">
                            Use {"{{SYMBOL}}"} for dynamic replacement
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-surface-800">
                    <button onClick={() => setMode('LIST')} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-5 py-2 text-sm bg-brand-blue text-white font-medium rounded-md hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-brand-blue/20 transition-all">
                        <Save size={16} /> Save Configuration
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};