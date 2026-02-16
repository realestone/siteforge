import React, { useState, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { ChevronRight, ChevronDown, Check, FileDown } from 'lucide-react';
import { useSiteContext } from '../context/SiteContext';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from './ui/badge';

export const RightPanel: React.FC = () => {
  const { boqItems, recentChanges } = useSiteContext();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['System Modules', 'Radios & RRH', 'Antennas'])
  );
  const [showAll, setShowAll] = useState(false);
  
  // Group items by category
  const groupedItems = boqItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof boqItems>);
  
  // Filter active items (quantity > 0)
  const activeItemsCount = boqItems.filter(item => item.quantity > 0).length;
  
  // Auto-expand categories with recent changes
  useEffect(() => {
    const categoriesToExpand = new Set<string>();
    boqItems.forEach(item => {
      if (recentChanges.has(item.id)) {
        categoriesToExpand.add(item.category);
      }
    });
    setExpandedCategories(prev => new Set([...prev, ...categoriesToExpand]));
  }, [recentChanges, boqItems]);
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  const hasRecentChanges = (category: string) => {
    return groupedItems[category]?.some(item => recentChanges.has(item.id));
  };
  
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">BOQ Live View</h2>
          <Badge variant="secondary" className="text-xs">
            {activeItemsCount} active items
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Active Only' : 'Show All'}
          </Button>
          <Button size="sm" variant="ghost" className="gap-2">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {Object.entries(groupedItems).map(([category, items]) => {
            const isExpanded = expandedCategories.has(category);
            const activeItems = items.filter(item => item.quantity > 0);
            const displayItems = showAll ? items : activeItems;
            
            if (displayItems.length === 0 && !showAll) return null;
            
            const categoryTotal = activeItems.reduce((sum, item) => {
              if (item.unit === 'm' || item.unit === 'pcs') {
                return sum + item.quantity;
              }
              return sum;
            }, 0);
            
            const hasChanges = hasRecentChanges(category);
            
            return (
              <div key={category} className="rounded-lg border bg-white overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="font-medium text-sm">{category}</span>
                    <span className="text-xs text-gray-500">({activeItems.length} items)</span>
                    {hasChanges && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                        ∆ just now
                      </Badge>
                    )}
                  </div>
                  {categoryTotal > 0 && (
                    <span className="text-xs text-gray-600">
                      total: {categoryTotal}
                    </span>
                  )}
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="border-t">
                        {displayItems.map((item) => {
                          const isRecent = recentChanges.has(item.id);
                          const hasChanged = item.previousQuantity !== undefined;
                          
                          return (
                            <motion.div
                              key={item.id}
                              initial={false}
                              animate={{
                                backgroundColor: isRecent ? '#FEF3C7' : '#FFFFFF',
                              }}
                              transition={{ duration: 2 }}
                              className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 text-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {item.name}
                                </div>
                                {item.rule && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {item.rule}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3 ml-4">
                                <div className="text-right">
                                  <div className="font-medium">
                                    {item.quantity} {item.unit}
                                  </div>
                                  {hasChanged && isRecent && (
                                    <motion.div
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0 }}
                                      className="text-xs text-gray-500"
                                    >
                                      ← was {item.previousQuantity}
                                    </motion.div>
                                  )}
                                  {item.isNew && isRecent && (
                                    <motion.div
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0 }}
                                      className="text-xs text-green-600 font-medium"
                                    >
                                      ← new
                                    </motion.div>
                                  )}
                                </div>
                                
                                {item.quantity > 0 && (
                                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">TOTALS</span>
          <div className="flex items-center gap-6 text-gray-600">
            <span>Materials: XXX NOK</span>
            <span>Services: XXX NOK</span>
            <span className="font-semibold text-gray-900">TOTAL: XXX NOK</span>
          </div>
        </div>
      </div>
    </div>
  );
};