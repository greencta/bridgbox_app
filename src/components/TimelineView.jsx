import React, { useState, useMemo } from 'react';
import TimelineItem from './TimelineItem';
import { motion, AnimatePresence } from 'framer-motion';

const FilterButton = ({ label, type, activeFilter, onClick }) => (
    <button
        onClick={() => onClick(type)}
        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            activeFilter === type
            ? 'bg-gray-800 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
    >
        {label}
    </button>
);

const TimelineSkeleton = () => (
    <div className="w-full mx-auto space-y-4 p-4 animate-pulse">
        {[...Array(2)].map((_, i) => (
            <div key={i}>
                <div className="h-5 w-24 bg-gray-200 rounded-md mb-3"></div>
                {[...Array(3)].map((_, j) => (
                    <div key={j} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex space-x-4 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
            </div>
        ))}
    </div>
);

const groupItemsByDate = (items) => {
    const groups = items.reduce((acc, item) => {
        const date = new Date(item.timestamp).toDateString();
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {});

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 864e5).toDateString();

    return Object.keys(groups).map(dateString => {
        let title = new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        if (dateString === today) title = 'Today';
        if (dateString === yesterday) title = 'Yesterday';
        
        return { title, data: groups[dateString] };
    });
};


export default function TimelineView({ items, isLoading, onSelectItem, hasSelection, onReply, onForward }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    const groupedAndFilteredItems = useMemo(() => {
        if (isLoading) return [];
        
        const filtered = items.filter(item => {
            if (activeFilter === 'all') return true;
            return item.type === activeFilter;
        });
        
        const searched = !searchTerm.trim() ? filtered : filtered.filter(item => {
            const lowercasedSearch = searchTerm.toLowerCase();
            if (item.subject?.toLowerCase().includes(lowercasedSearch)) return true;
            if (item.lastMessage?.toLowerCase().includes(lowercasedSearch)) return true;
            if (item.fileName?.toLowerCase().includes(lowercasedSearch)) return true;
            return false;
        });

        return groupItemsByDate(searched);

    }, [items, isLoading, activeFilter, searchTerm]);


    if (isLoading) {
        return <TimelineSkeleton />;
    }

    return (
        <motion.div 
            className="h-full bg-gray-100 flex flex-col"
            animate={{ width: hasSelection ? "50%" : "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <header className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
                <div className="w-full mx-auto">
                    <div className="relative">
                         <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input
                            type="text"
                            placeholder="Search timeline..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-base text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-[#FF3142] focus:border-[#FF3142]"
                        />
                    </div>
                     <div className="mt-3 flex space-x-2">
                        <FilterButton label="All" type="all" activeFilter={activeFilter} onClick={setActiveFilter} />
                        <FilterButton label="Emails" type="email" activeFilter={activeFilter} onClick={setActiveFilter} />
                        <FilterButton label="Chats" type="chat" activeFilter={activeFilter} onClick={setActiveFilter} />
                        <FilterButton label="Files" type="file" activeFilter={activeFilter} onClick={setActiveFilter} />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className="w-full mx-auto space-y-6 p-4">
                    <AnimatePresence>
                        {groupedAndFilteredItems.length > 0 ? (
                            groupedAndFilteredItems.map((group) => (
                                <motion.div 
                                    key={group.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <h2 className="text-sm font-bold text-gray-500 uppercase px-1 mb-3">{group.title}</h2>
                                    <div className="space-y-4">
                                        {group.data.map(item => (
                                            <TimelineItem 
                                                key={`${item.type}-${item.id}`} 
                                                item={item} 
                                                onSelectItem={onSelectItem}
                                                onReply={onReply}
                                                onForward={onForward}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </motion.div>
    );
}