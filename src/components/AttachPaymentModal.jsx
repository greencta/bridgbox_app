import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function AttachPaymentModal({ onClose, onAttach }) {
    const [amount, setAmount] = useState('');
    const [token, setToken] = useState('IRYS'); // Default to MATIC

    const handleAttach = () => {
        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            return toast.error("Please enter a valid amount.");
        }
        
        onAttach({
            amount: parsedAmount,
            token: token
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-[#1F2129] p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Attach Payment</h2>
                <p className="text-sm text-gray-400 mb-4">
                    The payment will be sent when you send the email.
                </p>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">Amount</label>
                        <div className="flex">
                            <input
                                type="text"
                                name="amount"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g., 0.5"
                                className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded-l-md focus:ring-accent focus:border-accent text-gray-200"
                            />
                             <select 
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="p-2 bg-gray-700 border border-l-0 border-gray-700 rounded-r-md text-white focus:ring-accent focus:border-accent"
                            >
                                <option>IRYS</option>
                        
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="text-gray-400 font-bold px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                    <button onClick={handleAttach} className="bg-accent text-black font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
                        Attach
                    </button>
                </div>
            </div>
        </div>
    );
}