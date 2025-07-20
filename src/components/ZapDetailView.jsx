// src/components/ZapDetailView.jsx

import React from 'react';

const DetailRow = ({ label, value, isCode = false }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className={`mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 ${isCode ? 'font-mono bg-gray-100 p-2 rounded-md' : ''}`}>
            {value}
        </dd>
    </div>
);

const getTriggerInfo = (zap) => {
    if (!zap || !zap.trigger) return { title: 'Unknown Trigger', details: [] };
    
    switch (zap.trigger.type) {
        case 'FILE_UPLOAD':
            return {
                title: 'When a file is uploaded...',
                details: [
                    { label: 'Filename Contains', value: zap.trigger.filter.fileNameContains || '(Any file)' }
                ]
            };
        case 'EMAIL_RECEIVED':
            return {
                title: 'When an email is received...',
                details: [
                    { label: 'From Address', value: zap.trigger.filter.fromAddress }
                ]
            };
        default:
            return { title: 'Unknown Trigger', details: [] };
    }
};

const getActionInfo = (zap) => {
    if (!zap || !zap.action) return { title: 'Unknown Action', details: [] };

    switch (zap.action.type) {
        case 'SEND_EMAIL':
            return {
                title: '...then send an email',
                details: [
                    { label: 'To', value: zap.action.params.to },
                    { label: 'Subject', value: zap.action.params.subject },
                    { label: 'Body', value: zap.action.params.body, isCode: true },
                ]
            };
        case 'SHARE_FILE':
            return {
                title: '...then share a file',
                details: [
                    { label: 'File to Share', value: zap.action.params.fileName },
                    { label: 'Share With', value: zap.action.params.shareWith },
                ]
            };
        default:
            return { title: 'Unknown Action', details: [] };
    }
};

export default function ZapDetailView({ zap, onBack }) {
    const triggerInfo = getTriggerInfo(zap);
    const actionInfo = getActionInfo(zap);

    return (
        <div className="p-4 sm:p-6 bg-gray-50 h-full">
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="text-gray-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-200 mr-4">
                    &larr; Back
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Automation Details</h1>
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
                {/* Trigger Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">{triggerInfo.title}</h2>
                    <dl className="divide-y divide-gray-200">
                        {triggerInfo.details.map(detail => <DetailRow key={detail.label} {...detail} />)}
                    </dl>
                </div>

                {/* Action Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">{actionInfo.title}</h2>
                     <dl className="divide-y divide-gray-200">
                        {actionInfo.details.map(detail => <DetailRow key={detail.label} {...detail} />)}
                    </dl>
                </div>
            </div>
        </div>
    );
}