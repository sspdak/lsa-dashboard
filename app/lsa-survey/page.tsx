"use client";

import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function PublicDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [filterWorkGroup, setFilterWorkGroup] = useState("All");
  const [filterAttendance, setFilterAttendance] = useState("All");

  // Fetch the static JSON file when the page loads
  useEffect(() => {
    fetch('/survey-data.json')
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error("Failed to load data. Did you put survey-data.json in the public folder?", err));
  }, []);

  // Filter the data based on dropdowns
  const filteredData = data.filter(row => {
    const matchWG = filterWorkGroup === "All" || row.workGroup === filterWorkGroup;
    const matchAtt = filterAttendance === "All" || row.attendance === filterAttendance;
    return matchWG && matchAtt;
  });

  // Calculate Metrics
  const totalResponses = filteredData.length;

  // Process Topics
  const topicCounts: Record<string, number> = {};
  filteredData.forEach(row => {
    if (row.topics) {
      const splitTopics = row.topics.split(';');
      splitTopics.forEach((t: string) => {
        const cleanTopic = t.trim();
        if (cleanTopic) topicCounts[cleanTopic] = (topicCounts[cleanTopic] || 0) + 1;
      });
    }
  });

  const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Chart Configurations
  const barChartData = {
    labels: sortedTopics.map(t => t[0].length > 50 ? t[0].substring(0, 50) + '...' : t[0]),
    datasets: [{
      label: 'Requests',
      data: sortedTopics.map(t => t[1]),
      backgroundColor: '#0f172a', // Navy
      borderRadius: 4
    }]
  };

  const getUniqueOptions = (key: string) => ["All", ...Array.from(new Set(data.map(d => d[key]))).filter(Boolean)];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">LSA 2026 Session Survey</h1>
          <p className="text-slate-500">Interactive Results Dashboard</p>
        </header>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Work Group</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded-md bg-slate-50"
              value={filterWorkGroup} 
              onChange={e => setFilterWorkGroup(e.target.value)}
            >
              {getUniqueOptions('workGroup').map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Attendance History</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded-md bg-slate-50"
              value={filterAttendance} 
              onChange={e => setFilterAttendance(e.target.value)}
            >
              {getUniqueOptions('attendance').map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        {/* Top Metric */}
        <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl inline-block">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Filtered Respondents</p>
          <p className="text-4xl font-bold text-slate-900">{totalResponses}</p>
        </div>

        {/* Charts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Top 10 Requested Topics</h2>
          <div className="h-96">
            {sortedTopics.length > 0 ? (
              <Bar 
                data={barChartData} 
                options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }} 
              />
            ) : (
              <p className="text-slate-500">No topics found for this filter combination.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}