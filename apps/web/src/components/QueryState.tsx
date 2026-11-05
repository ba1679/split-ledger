import React from 'react';
import { ApiError } from '../api/index.js';
export function QueryState({ pending, error, retry }: { pending?: boolean; error?: Error | null; retry?: () => void }) {
  if (pending) return <div className="state" role="status"><p>正在整理你的旅程…</p></div>;
  const message = error instanceof ApiError ? error.message : '請檢查連線後重新嘗試，你已保存的資料不會因此改變。';
  return <div className="state" role="alert"><h2>暫時無法取得帳本</h2><p>{message}</p><button className="btn" onClick={retry}>重新嘗試</button></div>;
}
