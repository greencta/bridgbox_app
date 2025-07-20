import React from 'react';

// --- THIS IS THE FIX ---
// Block explorer URL is now set to the Irys testnet explorer.
const IRYS_EXPLORER_URL = 'https://testnet-explorer.irys.xyz/tx';

/**
 * A component to display payment information within an email.
 * @param {{payment: {amount: number, token: string, txHash: string}}} props
 */
export default function PaymentInfo({ payment }) {
    if (!payment) return null;

    return (
        <div className="mb-4 p-3 rounded-lg bg-green-900/60 border border-green-700/80 flex items-center justify-between shadow-sm">
            {/* Left side: Icon and Text */}
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/80 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">$</span>
                </div>
                <div>
                     <p className="text-sm font-medium text-white">
                        Payment Received: <span className="font-bold">{payment.amount} {payment.token}</span>
                    </p>
                </div>
            </div>

            {/* Right side: Explorer Link */}
            {payment.txHash && (
                <a
                    href={`${IRYS_EXPLORER_URL}/${payment.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-300 hover:text-green-200 transition-colors font-semibold flex-shrink-0 ml-4 px-3 py-1 rounded-full bg-green-500/20 hover:bg-green-500/40"
                >
                    View on IrysScan
                </a>
            )}
        </div>
    );
}