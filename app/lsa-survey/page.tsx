"use client";

import { useEffect, useState } from 'react';
import { Chart as ChartJS, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function PublicDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [filterWorkGroup, setFilterWorkGroup] = useState("All");
  const [filterAttendance, setFilterAttendance] = useState("All");

  useEffect(() => {
    fetch('/survey-data.json')
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error("Failed to load data. Make sure survey-data.json is in the public folder.", err));
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
    labels: sortedTopics.map(t => t[0].length > 55 ? t[0].substring(0, 55) + '...' : t[0]),
    datasets: [{
      label: 'Requests',
      data: sortedTopics.map(t => t[1]),
      backgroundColor: '#0f172a', // Navy tone for the bars
      borderRadius: 4
    }]
  };

  const getUniqueOptions = (key: string) => {
    const uniqueVals = Array.from(new Set(data.map(d => d[key]))).filter(Boolean);
    return ["All", ...uniqueVals];
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 p-8 bg-slate-900 rounded-xl shadow-lg text-white">
          <h1 className="text-3xl font-bold mb-2">Legislative Staff Academy 2026</h1>
          <p className="text-slate-300">Session Topic Survey Results</p>
        </header>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Work Group</label>
            <select 
              className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterWorkGroup} 
              onChange={e => setFilterWorkGroup(e.target.value)}
            >
              {getUniqueOptions('workGroup').map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Attendance</label>
            <select 
              className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterAttendance} 
              onChange={e => setFilterAttendance(e.target.value)}
            >
              {getUniqueOptions('attendance').map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        {/* Top Metric */}
        <div className="mb-8 p-6 bg-white border border-slate-200 shadow-sm rounded-xl inline-block">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Matching Respondents</p>
          <p className="text-4xl font-bold text-slate-900">{totalResponses}</p>
        </div>

        {/* Chart */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Top 10 Requested Topics</h2>
          <div className="h-[400px]">
            {sortedTopics.length > 0 ? (
              <Bar 
                data={barChartData} 
                options={{ 
                  maintainAspectRatio: false, 
                  indexAxis: 'y', 
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: function(context) {
                          // Show the full, un-truncated string when hovering over a bar
                          return sortedTopics[context[0].dataIndex][0];
                        }
                      }
                    }
                  } 
                }} 
              />
            ) : (
              <p className="text-slate-500 text-center mt-10 italic">No topics found for this filter combination.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}