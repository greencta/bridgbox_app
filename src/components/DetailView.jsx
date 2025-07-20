import React, { lazy, Suspense } from 'react';

const EmailView = lazy(() => import('./EmailView'));
const DashboardView = lazy(() => import('./DashboardView'));

const LoadingPlaceholder = () => (
    <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
    </div>
);

export default function DetailView({ selectedItem, onClose, onReply, onForward, onProfileClick, stats, onCompose }) {
    if (!selectedItem) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50 p-4 text-center">
                <p className="text-gray-500">Select an item to view its details.</p>
            </div>
        );
    }
    
    let content;
    switch(selectedItem.type) {
        case 'email':
            content = <EmailView thread={selectedItem} onReply={onReply} onReplyAll={() => onReply(selectedItem)} onForward={onForward} onClose={onClose} onProfileClick={onProfileClick} />;
            break;
        case 'chat':
             content = <ChatDetailView thread={selectedItem} />;
             break;
        case 'file':
             content = (
                <div className="p-6">
                    <h2 className="text-xl font-bold">{selectedItem.fileName}</h2>
                    <p className="mt-2 text-gray-700">File details and a preview will be shown here.</p>
                </div>
             );
             break;
        default:
            content = <p className="p-6">Unknown item type.</p>;
    }

    return (
        <div
            className="h-full bg-white flex flex-col"
        >
            <div className="flex-shrink-0 p-4 border-b border-gray-200">
                 <button onClick={onClose} className="text-sm font-semibold text-[#FF3142] hover:underline">
                    &larr; Back to List
                 </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <Suspense fallback={<LoadingPlaceholder />}>
                    {content}
                </Suspense>
            </div>
        </div>
    );
}