"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminConverterPage() {
  const [status, setStatus] = useState("Waiting for Excel file...");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Reading file...");
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert Excel to JSON
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        // Clean and map the data
        const cleanData = rawJson.map((row: any) => {
          // Safely handle potential hidden spaces in the column headers
          const attendanceVal = row["How many LSAs have you attended?\u00A0"] || 
                                row["How many LSAs have you attended? "] || 
                                row["How many LSAs have you attended?"] || 
                                "Unknown";

          return {
            workGroup: row["What legislative work group are you a part of?"] || "Unknown",
            attendance: attendanceVal,
            topics: [
              row["General Professional Development"],
              row["Legislative Process and Environment"],
              row["Policy and Issue Areas"],
              row["Budget and Fiscal Policy"],
              row["Legal Foundations"],
              row["Research and Drafting"]
            ].filter(Boolean).join(";") // Combine all topic columns into one string
          };
        });

        // Create a downloadable JSON file
        const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        setDownloadUrl(url);
        setStatus(`Successfully processed ${cleanData.length} responses. Ready to download!`);
      } catch (error: any) {
        setStatus(`Error processing file: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Data Converter</h1>
        <p className="text-sm text-slate-500 mb-6">Upload your LSA Survey (.xlsx) to generate the static JSON file for the public dashboard.</p>
        
        <input 
          type="file" 
          accept=".xlsx, .csv" 
          onChange={handleFileUpload}
          className="mb-4 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer transition-colors"
        />
        
        <p className="text-sm font-medium text-slate-700 mb-4">{status}</p>

        {downloadUrl && (
          <a 
            href={downloadUrl} 
            download="survey-data.json"
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Download survey-data.json
          </a>
        )}
      </div>
    </div>
  );
}