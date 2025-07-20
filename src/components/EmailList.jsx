import React from 'react';
// --- THIS IS THE FIX ---
// This import now correctly matches the default export from EmailListItem.jsx
import EmailListItem from './EmailListItem';
import Skeleton from './Skeleton';

// Skeleton loader for when the email list is fetching data
const EmailListSkeleton = () => (
    <div className="px-2 space-y-1">
        {[...Array(12)].map((_, i) => (
            <div key={i} className="flex items-start space-x-4 p-3 rounded-xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                    <div className="h-3 w-full bg-gray-200 rounded"></div>
                </div>
            </div>
        ))}
    </div>
);

const EmptyState = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 className="mt-4 text-lg font-medium text-gray-600">Your {title} is empty</h2>
        <p className="mt-1 text-sm text-gray-500">
            There are no messages to show here right now.
        </p>
    </div>
);

export default function EmailList({
    threads,
    onSelectThread,
    isLoading,
    selectedThreadId,
    searchQuery,
    setSearchQuery,
    selectedThreadIds,
    onToggleSelect,
    onToggleSelectAll,
    onMarkAsRead,
    onDelete,
    currentView,
    contacts,
    hasMore,
    onLoadMore
}) {
    const numSelected = selectedThreadIds.length;
    const areAllSelected = numSelected > 0 && threads.length > 0 && numSelected === threads.length;
    const title = currentView === 'sent' ? 'Sent' : 'Inbox';

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 flex-shrink-0 border-b border-gray-200">
                {numSelected > 0 ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded bg-gray-200 border-gray-300 text-accent focus:ring-accent"
                                checked={areAllSelected}
                                onChange={onToggleSelectAll}
                            />
                            <p className="text-sm font-semibold text-gray-800">{numSelected} selected</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={onMarkAsRead}
                                className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Mark as Read
                            </button>
                            <button
                                onClick={onDelete}
                                className="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                        <div className="relative">
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-48 pl-10 pr-4 py-2 text-sm text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto">
                {isLoading && threads.length === 0 ? <EmailListSkeleton /> :
                 threads.length === 0 ? <EmptyState title={title} /> :
                 <div className="divide-y divide-gray-200">
                    {threads.map((thread) => (
                        <EmailListItem
                            key={thread.id}
                            thread={thread}
                            isSelected={selectedThreadIds.includes(thread.id)}
                            onSelect={() => onSelectThread(thread)}
                            onToggleSelect={() => onToggleSelect(thread.id)}
                            contacts={contacts}
                            currentView={currentView}
                        />
                    ))}
                 </div>
                }
                {hasMore && !isLoading && (
                    <div className="p-4 text-center">
                        <button
                            onClick={onLoadMore}
                            className="bg-gray-100 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Load More
                        </button>
                    </div>
                )}
                 {isLoading && threads.length > 0 && <EmailListSkeleton />}
            </div>
        </div>
    );
}