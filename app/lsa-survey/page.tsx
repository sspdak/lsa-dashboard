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
  
  const [displayMode, setDisplayMode] = useState<'raw' | 'percentage'>('raw');
  const [compareBy, setCompareBy] = useState<'workGroup' | 'attendance'>('workGroup');

  useEffect(() => {
    fetch(`/survey-data.json?v=${new Date().getTime()}`)
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error("Failed to load data.", err));
  }, []);

  const filteredData = data.filter(row => {
    const matchWG = selectedWorkGroups.includes("All") || selectedWorkGroups.includes(row.workGroup);
    const matchAtt = selectedAttendance.includes("All") || selectedAttendance.includes(row.attendance);
    return matchWG && matchAtt;
  });

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

  let compareGroups = ['All Selected'];
  if (compareBy === 'workGroup') {
    compareGroups = selectedWorkGroups.includes("All") ? ['All Selected'] : selectedWorkGroups;
  } else if (compareBy === 'attendance') {
    compareGroups = selectedAttendance.includes("All") ? ['All Selected'] : selectedAttendance;
  }

  const renderChart = (categoryId: string | null, title: string, isOverall: boolean = false) => {
    const topicSet = new Set<string>();
    
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

    const groupCounts: Record<string, Record<string, number>> = {};
    const groupTotals: Record<string, number> = {};
    const interestCounts: Record<string, number> = {};
    let totalInterest = 0;

    compareGroups.forEach(g => {
      groupCounts[g] = {};
      groupTotals[g] = 0;
      allTopics.forEach(t => groupCounts[g][t] = 0);
    });

    filteredData.forEach(row => {
      const rowGroup = compareBy === 'workGroup' ? row.workGroup : row.attendance;
      const assignedGroup = compareGroups.includes('All Selected') ? 'All Selected' : rowGroup;

      if (!compareGroups.includes(assignedGroup)) return;

      groupTotals[assignedGroup]++;

      const tallyTopics = (catStr: string) => {
        catStr.split(';').forEach(t => {
          const cleanT = t.trim();
          if (cleanT && groupCounts[assignedGroup][cleanT] !== undefined) {
            groupCounts[assignedGroup][cleanT]++;
          }
        });
      };

      if (categoryId && row.categories?.[categoryId]) {
        tallyTopics(row.categories[categoryId]);
        
        // Tally the Interest Levels for this category
        if (row.interest && row.interest[categoryId]) {
          const val = row.interest[categoryId];
          if (val) {
            interestCounts[val] = (interestCounts[val] || 0) + 1;
            totalInterest++;
          }
        }

      } else if (isOverall && row.categories) {
        Object.values(row.categories).forEach((catStr: any) => {
          if (typeof catStr === 'string') tallyTopics(catStr);
        });
      }
    });

    const sortedInterest = Object.entries(interestCounts).sort((a, b) => b[1] - a[1]);

    const overallCounts: Record<string, number> = {};
    allTopics.forEach(t => {
      overallCounts[t] = compareGroups.reduce((sum, g) => sum + groupCounts[g][t], 0);
    });

    const topTopics = Object.entries(overallCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(e => e[0]);

    if (topTopics.length === 0 || overallCounts[topTopics[0]] === 0) return null;

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

        const dataValues = topTopics.map(t => {
          const count = groupCounts[g][t];
          if (displayMode === 'percentage') {
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
        <h2 className={`${isOverall ? 'text-2xl' : 'text-lg'} font-bold text-slate-900 ${categoryId ? 'mb-3' : 'mb-4'}`}>{title}</h2>
        
        {/* Simplified Interest Level Visual */}
        {categoryId && sortedInterest.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center mr-1">General Interest:</span>
            {sortedInterest.map(([label, count]) => (
              <span key={label} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                {label} ({Math.round((count / totalInterest) * 100)}%)
              </span>
            ))}
          </div>
        )}

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

        <div className="sticky top-4 z-50 bg-white/95 backdrop-blur-md p-6 rounded-xl shadow-lg border border-slate-200 mb-8 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between transition-all">
          <div className="flex-1 w-full flex flex-col gap-5">
            <div className="flex flex-wrap gap-4 border-b border-slate-100 pb-4">
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

            <div>
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

            <div>
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

          <div className="flex-shrink-0 w-full xl:w-auto bg-slate-50 border border-slate-200 p-4 rounded-lg text-center shadow-inner">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Matching Respondents</p>
            <p className="text-4xl font-bold text-slate-900">{filteredData.length}</p>
          </div>
        </div>

        {renderChart(null, "Top 10 Overall Topics", true) || (
          <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 mb-8 text-center text-slate-500">
            No topic data found for this specific filter combination.
          </div>
        )}

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