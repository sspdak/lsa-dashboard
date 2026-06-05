"use client";

import { useEffect, useState } from 'react';
import { Chart as ChartJS, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CATEGORIES = [
  { id: 'genProf', title: 'General Professional Development' },
  { id: 'legProc', title: 'Legislative Process and Environment' },
  { id: 'policy', title: 'Policy and Issue Areas' },
  { id: 'budget', title: 'Budget and Fiscal Policy' },
  { id: 'legal', title: 'Legal Foundations' },
  { id: 'research', title: 'Research and Drafting' }
];

const COLORS = ['#0f172a', '#3b82f6', '#0ea5e9', '#6366f1', '#8b5cf6', '#cbd5e1'];

export default function PublicDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [selectedWorkGroups, setSelectedWorkGroups] = useState<string[]>(["All"]);
  const [selectedAttendance, setSelectedAttendance] = useState<string[]>(["All"]);

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

  // Toggle Logic for Multi-Select Filters
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

  // Groups to compare in charts
  const compareGroups = selectedWorkGroups.includes("All") ? ['All Selected'] : selectedWorkGroups;

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

    // 2. Count frequencies per group
    const groupCounts: Record<string, Record<string, number>> = {};
    compareGroups.forEach(g => {
      groupCounts[g] = {};
      allTopics.forEach(t => groupCounts[g][t] = 0);
    });

    filteredData.forEach(row => {
      const rowGroup = compareGroups.includes('All Selected') ? 'All Selected' : row.workGroup;
      if (!compareGroups.includes(rowGroup)) return;

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

    // 3. Find top topics overall for sorting
    const overallCounts: Record<string, number> = {};
    allTopics.forEach(t => {
      overallCounts[t] = compareGroups.reduce((sum, g) => sum + groupCounts[g][t], 0);
    });

    const topTopics = Object.entries(overallCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(e => e[0]);

    if (topTopics.length === 0 || overallCounts[topTopics[0]] === 0) return null;

    // 4. Build ChartJS Data
    const chartData = {
      labels: topTopics.map(t => t.length > (isOverall ? 60 : 40) ? t.substring(0, isOverall ? 60 : 40) + '...' : t),
      datasets: compareGroups.map((g, index) => ({
        label: g,
        data: topTopics.map(t => groupCounts[g][t]),
        backgroundColor: COLORS[index % COLORS.length],
        borderRadius: 4
      }))
    };

    return (
      <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${isOverall ? 'mb-8' : ''}`}>
        <h2 className={`${isOverall ? 'text-2xl' : 'text-lg'} font-bold text-slate-900 mb-4`}>{title}</h2>
        <div className={isOverall ? "h-[450px]" : "h-[300px]"}>
          <Bar 
            data={chartData} 
            options={{ 
              maintainAspectRatio: false, 
              indexAxis: 'y', 
              plugins: { 
                legend: { display: compareGroups.length > 1, position: 'top' },
                tooltip: { callbacks: { title: (ctx) => topTopics[ctx[0].dataIndex] } }
              },
              scales: { x: { ticks: { precision: 0 } } }
            }} 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 p-8 bg-slate-900 rounded-xl shadow-lg text-white">
          <h1 className="text-3xl font-bold mb-2">Legislative Staff Academy 2026</h1>
          <p className="text-slate-300">Session Topic Survey Results</p>
        </header>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="mb-6">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Filter by Work Group (Multi-Select)</span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => toggleSelection("All", selectedWorkGroups, setSelectedWorkGroups)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedWorkGroups.includes("All") ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                All Work Groups
              </button>
              {allWorkGroups.map(wg => (
                <button 
                  key={wg}
                  onClick={() => toggleSelection(wg, selectedWorkGroups, setSelectedWorkGroups)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedWorkGroups.includes(wg) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {wg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Filter by Attendance (Multi-Select)</span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => toggleSelection("All", selectedAttendance, setSelectedAttendance)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedAttendance.includes("All") ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                All Attendance
              </button>
              {sortedAttendance.map(att => (
                <button 
                  key={att}
                  onClick={() => toggleSelection(att, selectedAttendance, setSelectedAttendance)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedAttendance.includes(att) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {att}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-8 p-6 bg-white border border-slate-200 shadow-sm rounded-xl inline-block">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Matching Respondents</p>
          <p className="text-4xl font-bold text-slate-900">{filteredData.length}</p>
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