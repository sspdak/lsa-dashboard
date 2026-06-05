"use client";

import { useEffect, useState } from 'react';
import { Chart as ChartJS, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CATEGORIES = [
  { id: 'genProf', title: 'General Professional Development', color: '#3b82f6' }, 
  { id: 'legProc', title: 'Legislative Process and Environment', color: '#10b981' }, 
  { id: 'policy', title: 'Policy and Issue Areas', color: '#f59e0b' }, 
  { id: 'budget', title: 'Budget and Fiscal Policy', color: '#ef4444' }, 
  { id: 'legal', title: 'Legal Foundations', color: '#8b5cf6' }, 
  { id: 'research', title: 'Research and Drafting', color: '#0ea5e9' } 
];

const COMPARE_COLORS = ['#0f172a', '#64748b', '#94a3b8', '#cbd5e1'];

export default function PublicDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [selectedWorkGroups, setSelectedWorkGroups] = useState<string[]>(["All"]);
  const [selectedAttendance, setSelectedAttendance] = useState<string[]>(["All"]);
  
  // New State Toggles
  const [displayMode, setDisplayMode] = useState<'raw' | 'percentage'>('raw');
  const [compareBy, setCompareBy] = useState<'workGroup' | 'attendance'>('workGroup');

  useEffect(() => {
    fetch('/survey-data.json')
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error("Failed to load data.", err));
  }, []);

  // Filter Data
  const filteredData = data.filter(row => {
    const matchWG = selectedWorkGroups.includes("All") || selectedWorkGroups.includes(row.workGroup);
    const matchAtt = selectedAttendance.includes("All") || selectedAttendance.includes(row.attendance);
    return matchWG && matchAtt;
  });

  // Unique Options
  const allWorkGroups = Array.from(new Set(data.map(d => d.workGroup))).filter(Boolean).sort();
  const rawAttendance = Array.from(new Set(data.map(d => d.attendance))).filter(Boolean);
  const attendanceOrder = ["None", "1-2", "3-4", "More than 4"];
  const sortedAttendance = attendanceOrder.filter(a => rawAttendance.includes(a));

  const topicCategoryMap: Record<string, string> = {};
  data.forEach(row => {
    if (row.categories) {
      Object.entries(row.categories).forEach(([catId, catStr]) => {
        if (typeof catStr === 'string') {
          catStr.split(';').forEach(t => {
            const cleanT = t.trim();
            if (cleanT) topicCategoryMap[cleanT] = catId;
          });
        }
      });
    }
  });

  const toggleSelection = (item: string, currentList: string[], setList: (val: string[]) => void) => {
    if (item === "All") {
      setList(["All"]);
      return;
    }
    let newList = currentList.filter(i => i !== "All");
    if (newList.includes(item)) {
      newList = newList.filter(i => i !== item);
    } else {
      newList.push(item);
    }
    if (newList.length === 0) newList = ["All"];
    setList(newList);
  };

  // Determine what we are comparing
  let compareGroups = ['All Selected'];
  if (compareBy === 'workGroup' && !selectedWorkGroups.includes("All")) {
    compareGroups = selectedWorkGroups;
  } else if (compareBy === 'attendance' && !selectedAttendance.includes("All")) {
    compareGroups = selectedAttendance;
  }

  // Render Chart Helper
  const renderChart = (categoryId: string | null, title: string, isOverall: boolean = false) => {
    const topicSet = new Set<string>();
    
    // 1. Collect unique topics
    filteredData.forEach(row => {
      if (categoryId && row.categories?.[categoryId]) {
        row.categories[categoryId].split(';').forEach((t: string) => { if (t.trim()) topicSet.add(t.trim()); });
      } else if (isOverall && row.categories) {
        Object.values(row.categories).forEach((catStr: any) => {
          if (typeof catStr === 'string') {
            catStr.split(';').forEach(t => { if (t.trim()) topicSet.add(t.trim()); });
          }
        });
      }
    });

    const allTopics = Array.from(topicSet);
    if (allTopics.length === 0) return null;

    // 2. Count frequencies per group and calculate total respondents per group
    const groupCounts: Record<string, Record<string, number>> = {};
    const groupTotals: Record<string, number> = {}; // Total people in this group

    compareGroups.forEach(g => {
      groupCounts[g] = {};
      groupTotals[g] = 0;
      allTopics.forEach(t => groupCounts[g][t] = 0);
    });

    filteredData.forEach(row => {
      let rowGroup = 'All Selected';
      if (compareGroups.length > 1) {
        rowGroup = compareBy === 'workGroup' ? row.workGroup : row.attendance;
      }
      
      if (!compareGroups.includes(rowGroup)) return;

      // Add to total respondent count for this specific group
      groupTotals[rowGroup]++; 

      const tallyTopics = (catStr: string) => {
        catStr.split(';').forEach(t => {
          const cleanT = t.trim();
          if (cleanT && groupCounts[rowGroup][cleanT] !== undefined) {
            groupCounts[rowGroup][cleanT]++;
          }
        });
      };

      if (categoryId && row.categories?.[categoryId]) {
        tallyTopics(row.categories[categoryId]);
      } else if (isOverall && row.categories) {
        Object.values(row.categories).forEach((catStr: any) => {
          if (typeof catStr === 'string') tallyTopics(catStr);
        });
      }
    });

    // 3. Find top topics overall for sorting (based on raw counts for consistency)
    const overallCounts: Record<string, number> = {};
    allTopics.forEach(t => {
      overallCounts[t] = compareGroups.reduce((sum, g) => sum + groupCounts[g][t], 0);
    });

    const topTopics = Object.entries(overallCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(e => e[0]);

    if (topTopics.length === 0 || overallCounts[topTopics[0]] === 0) return null;

    // 4. Build ChartJS Data and Colors
    const isComparing = compareGroups.length > 1;
    
    const chartData = {
      labels: topTopics.map(t => t.length > (isOverall ? 60 : 40) ? t.substring(0, isOverall ? 60 : 40) + '...' : t),
      datasets: compareGroups.map((g, index) => {
        
        let barColors: string | string[];
        if (isComparing) {
          barColors = COMPARE_COLORS[index % COMPARE_COLORS.length];
        } else if (categoryId) {
          barColors = CATEGORIES.find(c => c.id === categoryId)?.color || '#0f172a';
        } else {
          barColors = topTopics.map(t => {
            const catId = topicCategoryMap[t];
            return CATEGORIES.find(c => c.id === catId)?.color || '#0f172a';
          });
        }

        // Apply raw number or percentage calculation
        const dataValues = topTopics.map(t => {
          const count = groupCounts[g][t];
          if (displayMode === 'percentage') {
             // Avoid division by zero
            return groupTotals[g] > 0 ? Number(((count / groupTotals[g]) * 100).toFixed(1)) : 0;
          }
          return count;
        });

        return {
          label: g,
          data: dataValues,
          backgroundColor: barColors,
          borderRadius: 4
        };
      })
    };

    return (
      <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${isOverall ? 'mb-8' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <h2 className={`${isOverall ? 'text-2xl' : 'text-lg'} font-bold text-slate-900`}>{title}</h2>
        </div>

        {/* Legend for the Overall Chart (Only shows when NOT comparing) */}
        {isOverall && !isComparing && (
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
            {CATEGORIES.map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                <span className="text-xs font-medium text-slate-600">{cat.title}</span>
              </div>
            ))}
          </div>
        )}

        <div className={isOverall ? "h-[450px]" : "h-[300px]"}>
          <Bar 
            data={chartData} 
            options={{ 
              maintainAspectRatio: false, 
              indexAxis: 'y', 
              plugins: { 
                legend: { display: isComparing, position: 'top' },
                tooltip: { 
                  callbacks: { 
                    title: (ctx) => topTopics[ctx[0].dataIndex],
                    label: (ctx) => {
                      const value = ctx.raw;
                      return displayMode === 'percentage' ? ` ${value}% of respondents` : ` ${value} requests`;
                    }
                  } 
                }
              },
              scales: { 
                x: { 
                  ticks: { 
                    precision: displayMode === 'raw' ? 0 : 1,
                    callback: (value) => displayMode === 'percentage' ? `${value}%` : value
                  } 
                } 
              }
            }} 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 p-8 bg-slate-900 rounded-xl shadow-lg text-white">
          <h1 className="text-3xl font-bold mb-2">Legislative Staff Academy 2026</h1>
          <p className="text-slate-300">Session Topic Survey Results</p>
        </header>

        {/* Sticky Header: Filters & Toggles */}
        <div className="sticky top-4 z-50 bg-white/95 backdrop-blur-md p-6 rounded-xl shadow-lg border border-slate-200 mb-8 flex flex-col gap-6 transition-all">
          
          {/* Top Row: Master Controls & Metrics */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div className="flex gap-4">
              {/* Display Mode Toggle */}
              <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                <button 
                  onClick={() => setDisplayMode('raw')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${displayMode === 'raw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Raw Numbers
                </button>
                <button 
                  onClick={() => setDisplayMode('percentage')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${displayMode === 'percentage' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Percentage (%)
                </button>
              </div>

              {/* Compare By Toggle */}
              <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                <button 
                  onClick={() => setCompareBy('workGroup')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${compareBy === 'workGroup' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Compare Work Groups
                </button>
                <button 
                  onClick={() => setCompareBy('attendance')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${compareBy === 'attendance' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Compare Attendance
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-center shadow-inner">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-3">Matching Respondents</span>
              <span className="text-2xl font-bold text-slate-900">{filteredData.length}</span>
            </div>
          </div>

          {/* Bottom Row: The actual multi-select filters */}
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Work Group</span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => toggleSelection("All", selectedWorkGroups, setSelectedWorkGroups)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedWorkGroups.includes("All") ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  All Work Groups
                </button>
                {allWorkGroups.map(wg => (
                  <button 
                    key={wg}
                    onClick={() => toggleSelection(wg, selectedWorkGroups, setSelectedWorkGroups)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedWorkGroups.includes(wg) ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {wg}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Attendance</span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => toggleSelection("All", selectedAttendance, setSelectedAttendance)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedAttendance.includes("All") ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  All Attendance
                </button>
                {sortedAttendance.map(att => (
                  <button 
                    key={att}
                    onClick={() => toggleSelection(att, selectedAttendance, setSelectedAttendance)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedAttendance.includes(att) ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {att}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Chart */}
        {renderChart(null, "Top 10 Overall Topics", true) || (
          <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 mb-8 text-center text-slate-500">
            No topic data found for this specific filter combination.
          </div>
        )}

        {/* Category Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {CATEGORIES.map(cat => (
            <div key={cat.id}>
              {renderChart(cat.id, cat.title, false)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}