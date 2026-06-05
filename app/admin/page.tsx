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
        
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const cleanData = rawJson.map((row: any) => {
          const attendanceVal = row["How many LSAs have you attended?\u00A0"] || 
                                row["How many LSAs have you attended? "] || 
                                row["How many LSAs have you attended?"] || 
                                "None";

          return {
            workGroup: row["What legislative work group are you a part of?"] || "Unknown",
            attendance: typeof attendanceVal === 'string' ? attendanceVal.trim() : attendanceVal,
            // We are now keeping the topics separated by category
            categories: {
              genProf: row["General Professional Development"] || "",
              legProc: row["Legislative Process and Environment"] || "",
              policy: row["Policy and Issue Areas"] || "",
              budget: row["Budget and Fiscal Policy"] || "",
              legal: row["Legal Foundations"] || "",
              research: row["Research and Drafting"] || ""
            }
          };
        });

        const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        setDownloadUrl(url);
        setStatus(`Successfully processed ${cleanData.length} responses with category groupings. Ready to download!`);
      } catch (error: any) {
        setStatus(`Error processing file: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Data Converter V2</h1>
        <p className="text-sm text-slate-500 mb-6">Upload your LSA Survey to generate the categorized JSON file.</p>
        
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
            Download updated survey-data.json
          </a>
        )}
      </div>
    </div>
  );
}