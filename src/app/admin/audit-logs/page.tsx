'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Clock, User, FileJson } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/audit-logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading security audit log trail...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-2xl font-bold text-white tracking-tight">Security & Compliance Audit Trail</h1>
        <p className="text-slate-400 text-xs mt-1">Immutable audit logs capturing administrative actions, pricing tier changes, and payment records.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 uppercase font-semibold text-[10px]">
              <th className="text-left py-3 px-4">Timestamp</th>
              <th className="text-left py-3 px-4">Actor Email</th>
              <th className="text-left py-3 px-4">Action</th>
              <th className="text-left py-3 px-4">Entity</th>
              <th className="text-left py-3 px-4">State Diff / Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/50">
                <td className="py-3 px-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="py-3 px-4 text-indigo-300 font-bold">{log.actorEmail}</td>
                <td className="py-3 px-4">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {log.entityType} ({log.entityId})
                </td>
                <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                  {log.afterJson || log.beforeJson || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
