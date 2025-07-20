import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import CreateZapView from './CreateZapView';
import EscrowDetailView from './EscrowDetailView';
import ZapDetailView from './ZapDetailView';
import getIrys from '../utils/irys';
import { useAppContext } from '../context/AppContext.jsx';
import { Buffer } from 'buffer';
import ConfirmDeleteZapModal from './ConfirmDeleteZapModal';

const ZapListItem = ({ zap, onSelect, onDelete }) => {
    const getTriggerText = () => {
        if (zap.type === 'ESCROW') return `Escrow Agreement`;
        if (!zap.trigger) return "Invalid Automation";
        switch (zap.trigger.type) {
            case 'FILE_UPLOAD':
                const filterText = zap.trigger.filter.fileNameContains;
                return `File upload ${filterText ? `contains "${filterText}"` : ''}`;
            case 'EMAIL_RECEIVED':
                return `Email received from "${zap.trigger.filter.fromAddress}"`;
            default:
                return "Unknown Trigger";
        }
    };
    
    const getActionText = () => {
        if (zap.type === 'ESCROW') {
            const amount = zap.amount || 0;
            const freelancer = zap.freelancer?.substring(0, 8) || '...';
            return `Pay ${amount} $IRYS to ${freelancer}...`;
        }
        if (!zap.action || !zap.action.params) return "Invalid Action";
        switch (zap.action.type) {
            case 'SEND_EMAIL':
                return `Send an email to "${zap.action.params.to}"`;
            case 'SHARE_FILE':
                 return `Share the file "${zap.action.params.fileName || 'from trigger'}"`; // Updated for clarity
            default:
                return "Unknown Action";
        }
    };

    return (
        <div onClick={onSelect} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-[#FF3142] hover:shadow-md transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
                <div className="flex-grow">
                    <p className="font-semibold text-gray-800">{getTriggerText()}</p>
                    <p className="text-sm text-gray-500">{getActionText()}</p>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                     <span className={`px-3 py-1 text-xs font-bold rounded-full ${zap.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {zap.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(zap);
                        }}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function ZapsView({ onZapsUpdated, driveFiles, isLoadingDrive }) {
    const { session } = useAppContext();
    const [isCreating, setIsCreating] = useState(false);
    const [zaps, setZaps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEscrow, setSelectedEscrow] = useState(null);
    const [selectedZap, setSelectedZap] = useState(null);
    const [zapToDeactivate, setZapToDeactivate] = useState(null);

    const fetchZaps = useCallback(async () => {
        if (!session?.wallet?.address) return;
        setIsLoading(true);
        try {
            const irys = await getIrys();
            const results = await irys.search("irys:transactions").from([session.wallet.address]);
            
            const allItemTransactions = results.filter(tx => 
                tx.tags.some(tag => tag.name === "App-Name" && (tag.value === "Bridgbox-Zaps" || tag.value === "Bridgbox-Escrows"))
            );
            
            const deactivatedIds = new Set();
            results.forEach(tx => {
                if (tx.tags.some(tag => tag.name === "App-Name" && tag.value === "Bridgbox-Deactivation")) {
                    const deactivatesTag = tx.tags.find(tag => tag.name === "Deactivates");
                    if (deactivatesTag) {
                        deactivatedIds.add(deactivatesTag.value);
                    }
                }
            });

            const activeZapPromises = allItemTransactions
                .filter(tx => !deactivatedIds.has(tx.id))
                .map(async (tx) => {
                    try {
                        const response = await fetch(`https://gateway.irys.xyz/${tx.id}`);
                        if (!response.ok) return null;
                        const zapData = await response.json();
                        if (zapData.isActive !== false) {
                            return { ...zapData, irysTxId: tx.id };
                        }
                    } catch (e) {
                        console.error(`Failed to process transaction ${tx.id}:`, e);
                    }
                    return null;
                });
            
            const fetchedZaps = (await Promise.all(activeZapPromises)).filter(Boolean);
            setZaps(fetchedZaps.reverse());

        } catch (error) {
            console.error("Failed to fetch Zaps/Escrows from Irys:", error);
            toast.error("Could not load your items.");
        } finally {
            setIsLoading(false);
        }
    }, [session.wallet.address]);
    
    useEffect(() => {
        fetchZaps();
    }, [fetchZaps]);

    const handleSaveSuccess = () => {
        setIsCreating(false);
        fetchZaps(); 
        if (onZapsUpdated) onZapsUpdated();
    };

    const handleDeactivateConfirm = async () => {
        if (!zapToDeactivate) return;

        const loadingToast = toast.loading('Deactivating item...');
        try {
            const irys = await getIrys();
            const tags = [
                { name: "Content-Type", value: "application/json" },
                { name: "App-Name", value: "Bridgbox-Deactivation" },
                { name: "Deactivates", value: zapToDeactivate.irysTxId }
            ];

            const deactivationData = {
                deactivatedAt: new Date().toISOString(),
                targetTx: zapToDeactivate.irysTxId
            };
            
            await irys.upload(Buffer.from(JSON.stringify(deactivationData)), { tags });
            
            toast.success('Item deactivated successfully!', { id: loadingToast });
            fetchZaps();

        } catch (error) {
            console.error("Failed to deactivate item:", error);
            toast.error("Could not deactivate item.", { id: loadingToast });
        } finally {
            setZapToDeactivate(null);
        }
    };
    
    if (selectedZap) {
        return <ZapDetailView zap={selectedZap} onBack={() => setSelectedZap(null)} />;
    }
    
    if (selectedEscrow) {
        return <EscrowDetailView escrowItem={selectedEscrow} onBack={() => setSelectedEscrow(null)} onEscrowAction={fetchZaps} />;
    }
    
    if (isCreating) {
        return <CreateZapView 
                    onSaveSuccess={handleSaveSuccess} 
                    onCancel={() => setIsCreating(false)}
                    driveFiles={driveFiles}
                    isLoadingDrive={isLoadingDrive}
                />;
    }

    return (
        <div className="h-full p-6 flex flex-col bg-gray-50 text-gray-800">
            {zapToDeactivate && (
                <ConfirmDeleteZapModal 
                    onConfirm={handleDeactivateConfirm}
                    onCancel={() => setZapToDeactivate(null)}
                />
            )}

            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Automations & Escrows</h1>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="bg-[#FF3142] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md"
                >
                    Create New
                </button>
            </div>
            
            <div className="flex-grow">
                {isLoading ? <p className="text-center mt-16 text-gray-500">Loading your items...</p> : 
                zaps.length === 0 ? 
                    <div className="text-center mt-16 bg-white p-8 rounded-xl border border-gray-200">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No Items Yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Create your first Zap or Escrow.</p>
                    </div> :
                <div className="space-y-4">
                    {zaps.map((zap) => (
                       <ZapListItem 
                           key={zap.irysTxId} 
                           zap={zap} 
                           onSelect={() => {
                               if (zap.type === 'ESCROW') {
                                   setSelectedEscrow(zap);
                               } else {
                                   setSelectedZap(zap);
                               }
                           }}
                           onDelete={() => setZapToDeactivate(zap)}
                       />
                    ))}
                </div>
                }
            </div>
        </div>
    );
}