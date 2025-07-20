import React from 'react';
import { useAppContext } from '../context/AppContext.jsx';

const StatCard = ({ label, value, icon, onClick }) => (
    <div onClick={onClick} className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between hover:border-[#FF3142] hover:shadow-lg transition-all cursor-pointer">
        <div>
            <div className="bg-gray-100 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}></path></svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">{label}</p>
        </div>
        <p className="text-4xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
);

const QuickActionButton = ({ label, icon, onClick }) => (
    <button onClick={onClick} className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 flex items-center space-x-4 hover:bg-gray-50 hover:border-[#FF3142] transition-colors">
        <div className="bg-[#FF3142]/10 p-3 rounded-lg">
            <svg className="w-6 h-6 text-[#FF3142]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}></path></svg>
        </div>
        <p className="font-semibold text-gray-800">{label}</p>
    </button>
);


export default function DashboardView({ stats, onSelectView, onCompose }) {
    const { session, profilesCache } = useAppContext();
    const profile = profilesCache[session.wallet.address.toLowerCase()] || {};
    const displayName = profile.username || `User`;

    return (
        <div className="h-full bg-gray-50 p-6 sm:p-8 space-y-8 overflow-y-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome, {displayName}</h1>
                <p className="text-gray-600 mt-1">Here's a quick look at your Bridgbox activity.</p>
            </div>

            {/* --- THIS IS THE FIX --- */}
            {/* The grid now uses md:grid-cols-3 since the chat card has been removed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Email Threads" value={stats.emailCount} icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" onClick={() => onSelectView('inbox')} />
                <StatCard label="Files in Drive" value={stats.fileCount} icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" onClick={() => onSelectView('drive')} />
                <StatCard label="Contacts" value={stats.contactCount} icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" onClick={() => onSelectView('contacts')} />
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button onClick={onCompose} className="w-full text-left bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center space-x-4 hover:bg-[#FF3142]/5 hover:border-[#FF3142] transition-colors">
                        <svg className="w-6 h-6 text-[#FF3142]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"></path></svg>
                        <span className="font-semibold text-gray-800">Compose New Email</span>
                    </button>
                    <button onClick={() => onSelectView('drive')} className="w-full text-left bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center space-x-4 hover:bg-[#FF3142]/5 hover:border-[#FF3142] transition-colors">
                        <svg className="w-6 h-6 text-[#FF3142]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        <span className="font-semibold text-gray-800">Upload a File</span>
                    </button>
                </div>
            </div>
        </div>
    );
}