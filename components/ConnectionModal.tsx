
import React, { useState } from 'react';
import { ExchangeProfile } from '../types';
import { X, Plus, Globe, Server, Save, Trash2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-terminal-border rounded-lg w-[600px] shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-terminal-border bg-[#0d1117]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe size={18} className="text-terminal-blue" /> Connection Manager
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'LIST' ? (
            <div className="space-y-2">
               {profiles.map(p => (
                 <div key={p.id} className="flex items-center justify-between p-3 bg-[#0d1117] border border-terminal-border rounded hover:border-terminal-blue group">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${p.type === 'PRESET' ? 'bg-terminal-blue/10 text-terminal-blue' : 'bg-terminal-yellow/10 text-terminal-yellow'}`}>
                           <Server size={16} />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-gray-200">{p.name}</div>
                            <div className="text-[10px] font-mono text-gray-500">
                                {p.type === 'PRESET' ? `PRESET: ${p.providerId}` : `WS: ${p.wsUrl?.substring(0, 30)}...`}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { onConnect(p); onClose(); }}
                            className="px-3 py-1 text-xs font-bold bg-terminal-green/20 text-terminal-green border border-terminal-green/50 rounded hover:bg-terminal-green/30"
                        >
                            CONNECT
                        </button>
                        {p.type === 'CUSTOM' && (
                             <button onClick={() => onDeleteProfile(p.id)} className="p-1 text-terminal-red opacity-0 group-hover:opacity-100 hover:bg-terminal-red/10 rounded">
                                <Trash2 size={14} />
                             </button>
                        )}
                    </div>
                 </div>
               ))}
               
               <button 
                 onClick={() => setMode('ADD')}
                 className="w-full py-3 border border-dashed border-gray-700 text-gray-500 rounded hover:border-gray-500 hover:text-gray-300 flex items-center justify-center gap-2 text-sm"
               >
                 <Plus size={16} /> Add New Connection
               </button>
            </div>
          ) : (
            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                    <input 
                        className="w-full bg-[#0d1117] border border-terminal-border rounded p-2 text-sm text-white focus:border-terminal-blue outline-none"
                        value={newProfile.name}
                        onChange={e => setNewProfile({...newProfile, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">WebSocket Endpoint (wss://)</label>
                    <input 
                        className="w-full bg-[#0d1117] border border-terminal-border rounded p-2 text-sm text-terminal-yellow font-mono focus:border-terminal-blue outline-none"
                        value={newProfile.wsUrl}
                        placeholder="wss://ws.kraken.com"
                        onChange={e => setNewProfile({...newProfile, wsUrl: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Subscription JSON Message (use {"{{SYMBOL}}"} placeholder)</label>
                    <textarea 
                        className="w-full h-32 bg-[#0d1117] border border-terminal-border rounded p-2 text-xs text-gray-400 font-mono focus:border-terminal-blue outline-none"
                        value={newProfile.subscriptionMessage}
                        onChange={e => setNewProfile({...newProfile, subscriptionMessage: e.target.value})}
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Example: {`{"event": "subscribe", "pair": ["{{SYMBOL}}"]}`}</p>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-terminal-border">
                    <button onClick={() => setMode('LIST')} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-xs bg-terminal-blue text-black font-bold rounded hover:bg-blue-400 flex items-center gap-2">
                        <Save size={14} /> Save Connection
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
