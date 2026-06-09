import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Target, Zap, Search, ChevronRight, RefreshCw, Activity, Calendar, Clock, BookOpen, Award } from 'lucide-react';
import Modal from '@/components/Modal';

const RISK_COLOR: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  high: { label: '高风险', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { label: '中风险', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  low: { label: '低风险', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};

const TREND_ICON: Record<string, any> = { improving: TrendingUp, stable: Minus, declining: TrendingDown };
const TREND_COLOR: Record<string, string> = { improving: 'text-green-500', stable: 'text-gray-500', declining: 'text-red-500' };
const TREND_TEXT: Record<string, string> = { improving: '上升', stable: '平稳', declining: '下降' };

export default function StudentAnalysis() {
  const [overview, setOverview] = useState<any>(null);
  const [riskList, setRiskList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [totalRisk, setTotalRisk] = useState(0);
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOverview();
    loadRiskList();
    loadStudents();
  }, [page, riskFilter]);

  const loadOverview = async () => {
    try { const res: any = await api.get('/student-analysis/overview'); if (res.success) setOverview(res.data); } catch (e) { /* ignore */ }
  };

  const loadRiskList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: 15 });
      if (riskFilter) params.append('risk_level', riskFilter);
      const res: any = await api.get(`/student-analysis/risk/list?${params.toString()}`);
      if (res.success) {
        setRiskList(res.data.list.filter((r: any) => !search || r.student_name?.includes(search)));
        setTotalRisk(res.data.total);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const loadStudents = async () => {
    try { const res: any = await api.get('/students?limit=100'); if (res.success) setStudents(res.data.list || []); } catch (e) { /* ignore */ }
  };

  const runAnalysis = async (studentId?: number) => {
    if (!confirm(studentId ? '确定重新分析该学员吗？' : '确定对所有学员进行学情分析吗？')) return;
    try {
      if (studentId) {
        await api.post(`/student-analysis/analyze/${studentId}`);
      } else {
        for (const s of students.slice(0, 20)) {
          try { await api.post(`/student-analysis/analyze/${s.id}`); } catch (e) { /* ignore */ }
        }
      }
      alert('分析完成');
      loadOverview();
      loadRiskList();
    } catch (e) { alert('分析失败'); }
  };

  const loadStudentDetail = async (studentId: number) => {
    try { const res: any = await api.get(`/student-analysis/student/${studentId}`); if (res.success) setShowDetail(res.data); } catch (e) { /* ignore */ }
  };

  const getCourseName = (c: string) => ({ subject1: '科目一', subject2: '科目二', subject3: '科目三', subject4: '科目四' }[c] || c);
  const getTrainingName = (t: string) => ({ C1: 'C1手动', C2: 'C2自动', A1: 'A1客车', A2: 'A2牵引', B1: 'B1中巴', B2: 'B2货车' }[t] || t);

  const riskStats = overview?.risk_stats || [];
  const totalByRisk: Record<string, number> = {};
  riskStats.forEach((r: any) => { totalByRisk[r.risk_level] = (totalByRisk[r.risk_level] || 0) + r.count; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <Brain className="text-blue-500" /> 学员学情分析
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">智能分析学习数据，识别风险并生成个性化建议</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => runAnalysis()} className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5">
            <RefreshCw size={16} /> 全量分析
          </button>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-5 gap-4">
          <StatCard icon={Brain} label="已分析学员" value={overview.total_analyzed} color="blue" />
          <StatCard icon={CheckCircle2} label="低风险" value={totalByRisk.low || 0} color="green" />
          <StatCard icon={Activity} label="中风险" value={totalByRisk.medium || 0} color="yellow" />
          <StatCard icon={AlertTriangle} label="高风险" value={totalByRisk.high || 0} color="red" />
          <StatCard icon={Zap} label="平均学习效率" value={`${overview.avg_efficiency || 0}%`} color="purple" />
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[var(--border)]">
            <h3 className="font-medium text-[var(--text)] mb-4">风险分布</h3>
            <div className="flex items-center gap-5">
              <div className="relative w-36 h-36 flex-shrink-0">
                <DonutChart data={[
                  { value: totalByRisk.low || 0, color: '#22c55e' },
                  { value: totalByRisk.medium || 0, color: '#eab308' },
                  { value: totalByRisk.high || 0, color: '#ef4444' },
                ]} />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <div className="text-2xl font-bold text-[var(--text)]">{overview.total_analyzed || 0}</div>
                  <div className="text-xs text-[var(--text-secondary)]">总人数</div>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                {(['low', 'medium', 'high'] as const).map((level) => {
                  const cfg = RISK_COLOR[level];
                  const count = totalByRisk[level] || 0;
                  const pct = overview.total_analyzed > 0 ? (count / overview.total_analyzed) * 100 : 0;
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                          <span className={cfg.text}>{cfg.label}</span>
                        </div>
                        <span className="text-[var(--text-secondary)]">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[var(--border)]">
            <h3 className="font-medium text-[var(--text)] mb-4">学习趋势 & 重点关注</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['improving', 'stable', 'declining'] as const).map((trend) => {
                const Icon = TREND_ICON[trend];
                const count = overview.trend_stats?.find((t: any) => t.recent_trend === trend)?.count || 0;
                return (
                  <div key={trend} className={`p-3 rounded-xl text-center ${trend === 'declining' ? 'bg-red-50' : trend === 'improving' ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <Icon size={24} className={`mx-auto mb-1 ${TREND_COLOR[trend]}`} />
                    <div className="text-xl font-bold text-[var(--text)]">{count}</div>
                    <div className={`text-xs ${TREND_COLOR[trend]}`}>{TREND_TEXT[trend]}</div>
                  </div>
                );
              })}
            </div>
            {overview?.high_risk_list?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-1">
                  <AlertTriangle size={14} className="text-red-500" /> 高风险名单
                </h4>
                <div className="space-y-1.5 max-h-[130px] overflow-y-auto">
                  {overview.high_risk_list.slice(0, 5).map((h: any) => (
                    <button onClick={() => loadStudentDetail(h.student_id)} key={h.student_id} className="w-full flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold">{h.student_name?.charAt(0)}</div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text)]">{h.student_name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{getTrainingName(h.training_type)} · {getCourseName(h.course_type)}</div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-red-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索学员姓名..." className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }} className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">全部风险等级</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">低风险</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">学员</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">培训类型</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">科目</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">累计学时</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">训练天数</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">日均时长</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">周频次</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">趋势</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">效率</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">风险</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">预计完成</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-[var(--text-secondary)]">加载中...</td></tr>
              ) : riskList.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-[var(--text-secondary)]">暂无数据，请先运行学情分析</td></tr>
              ) : riskList.map((r) => {
                const TrendIcon = TREND_ICON[r.recent_trend] || Minus;
                const riskCfg = RISK_COLOR[r.risk_level] || RISK_COLOR.low;
                return (
                  <tr key={r.id} className="border-b border-[var(--border)]/50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{r.student_name?.charAt(0)}</div>
                        <div>
                          <div className="font-medium text-[var(--text)]">{r.student_name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{r.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{getTrainingName(r.training_type)}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{getCourseName(r.course_type)}</td>
                    <td className="py-3 px-4 text-center font-medium text-[var(--text)]">{r.total_hours?.toFixed(1)}h</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{r.training_days}天</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{r.avg_hours_per_day?.toFixed(1)}h</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">{r.weekly_frequency}次/周</td>
                    <td className="py-3 px-4 text-center">
                      <div className={`flex items-center justify-center gap-1 ${TREND_COLOR[r.recent_trend]}`}>
                        <TrendIcon size={14} />
                        <span className="text-xs">{TREND_TEXT[r.recent_trend]}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${r.learning_efficiency >= 70 ? 'bg-green-500' : r.learning_efficiency >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${r.learning_efficiency || 0}%` }} />
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">{r.learning_efficiency}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${riskCfg.bg} ${riskCfg.text}`}>{riskCfg.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)] text-xs">{r.expected_completion_date || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => loadStudentDetail(r.student_id)} className="text-primary hover:underline text-xs">详情</button>
                        <button onClick={() => runAnalysis(r.student_id)} className="text-blue-500 hover:underline text-xs">分析</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalRisk > 15 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50">上一页</button>
            <span className="text-sm text-[var(--text-secondary)]">第 {page} 页</span>
            <button onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded hover:bg-gray-50">下一页</button>
          </div>
        )}
      </div>

      {showDetail && <StudentDetailModal data={showDetail} onClose={() => setShowDetail(null)} getCourseName={getCourseName} getTrainingName={getTrainingName} onReAnalyze={(id) => runAnalysis(id)} />}
    </div>
  );
}

function StudentDetailModal({ data, onClose, getCourseName, getTrainingName, onReAnalyze }: any) {
  return (
    <Modal title={`${data.student?.name} - 学情分析`} onClose={onClose} width="max-w-4xl">
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">学员</div>
            <div className="font-bold text-[var(--text)]">{data.student?.name}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">培训类型</div>
            <div className="font-medium text-[var(--text)]">{getTrainingName(data.student?.training_type)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">当前阶段</div>
            <div className="font-medium text-[var(--text)]">{getCourseName(data.student?.stage)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">分析日期</div>
            <div className="font-medium text-[var(--text)]">{data.analysis_date}</div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-[var(--text)] mb-3">各科目学习分析</h4>
          <div className="space-y-3">
            {data.analysis?.map((a: any) => {
              const TrendIcon = TREND_ICON[a.recent_trend] || Minus;
              const riskCfg = RISK_COLOR[a.risk_level] || RISK_COLOR.low;
              return (
                <div key={a.id} className={`p-4 ${riskCfg.bg}/50 rounded-xl border ${riskCfg.bg.replace('50', '100')}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center ${riskCfg.text} font-bold`}>
                        {getCourseName(a.course_type).replace('科目', '科')}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text)] flex items-center gap-2">
                          {getCourseName(a.course_type)}
                          <span className={`flex items-center gap-1 text-xs ${TREND_COLOR[a.recent_trend]}`}>
                            <TrendIcon size={12} /> {TREND_TEXT[a.recent_trend]}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {a.total_hours}h · {a.training_days}天 · 日均{a.avg_hours_per_day}h · 每周{a.weekly_frequency}次
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${riskCfg.bg} ${riskCfg.text}`}>{riskCfg.label}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">效率: {a.learning_efficiency}%</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {a.strong_points?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1"><Award size={12} /> 优势项</div>
                        <div className="flex flex-wrap gap-1">
                          {a.strong_points.map((s: string, i: number) => <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">{s}</span>)}
                        </div>
                      </div>
                    )}
                    {a.weak_points?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1"><Target size={12} /> 待加强</div>
                        <div className="flex flex-wrap gap-1">
                          {a.weak_points.map((s: string, i: number) => <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{s}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                  {a.suggestions?.length > 0 && (
                    <div className="mt-2 p-2.5 bg-white rounded-lg border border-white">
                      <div className="text-xs font-medium text-primary mb-1 flex items-center gap-1"><BookOpen size={12} /> 学习建议</div>
                      <ul className="text-xs text-[var(--text-secondary)] space-y-0.5">
                        {a.suggestions.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {a.expected_completion_date && (
                    <div className="mt-2 text-xs text-[var(--text-secondary)] flex items-center gap-1">
                      <Calendar size={12} /> 预计完成日期: {a.expected_completion_date}
                    </div>
                  )}
                </div>
              );
            })}
            {(!data.analysis || data.analysis.length === 0) && (
              <div className="text-center py-6 text-[var(--text-secondary)]">暂无分析数据，点击下方按钮开始分析</div>
            )}
          </div>
        </div>

        {data.timeline?.length > 0 && (
          <div className="p-4 bg-white rounded-xl border border-[var(--border)]">
            <h4 className="font-medium text-[var(--text)] mb-3 flex items-center gap-2"><Clock size={16} className="text-blue-500" /> 近30天训练时间线</h4>
            <div className="flex items-end gap-1 h-20">
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (29 - i));
                const key = d.toISOString().substring(0, 10);
                const dayData = data.timeline.filter((t: any) => t.d === key);
                const total = dayData.reduce((s: number, t: any) => s + parseFloat(t.h || 0), 0);
                const height = Math.max(2, (total / 6) * 100);
                return (
                  <div key={key} className="flex-1 group relative">
                    <div className="w-full bg-gradient-to-t from-primary/20 to-primary rounded-t-sm transition-all" style={{ height: `${height}%` }} />
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--text)] text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                      {key.substring(5)}: {total.toFixed(1)}h
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <button onClick={() => onReAnalyze(data.student?.id)} className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 flex items-center gap-2">
            <RefreshCw size={16} /> 重新分析
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-gray-50">关闭</button>
        </div>
      </div>
    </Modal>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = { blue: 'from-blue-500 to-blue-600', green: 'from-green-500 to-green-600', yellow: 'from-yellow-500 to-orange-500', red: 'from-red-500 to-red-600', purple: 'from-purple-500 to-purple-600' };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white`}>
          <Icon size={20} />
        </div>
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
    </div>
  );
}

function DonutChart({ data }: { data: { value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="w-full h-full rounded-full border-8 border-gray-100" />;
  let cumulative = 0;
  const segments = data.map((d, i) => {
    const start = (cumulative / total) * 360;
    cumulative += d.value;
    const end = (cumulative / total) * 360;
    const largeArc = end - start > 180 ? 1 : 0;
    const cx = 72, cy = 72, r = 64, inner = 48;
    const toXY = (deg: number, rad: number) => {
      const a = (deg - 90) * Math.PI / 180;
      return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    };
    const [x1, y1] = toXY(start, r);
    const [x2, y2] = toXY(end, r);
    const [x3, y3] = toXY(end, inner);
    const [x4, y4] = toXY(start, inner);
    if (d.value === 0) return null;
    const path = d.value === total
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} L ${cx} ${cy - r} Z M ${cx} ${cy - inner} A ${inner} ${inner} 0 1 0 ${cx - 0.001} ${cy - inner} Z`
      : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    return <path key={i} d={path} fill={d.color} />;
  });
  return (
    <svg viewBox="0 0 144 144" className="w-full h-full -rotate-0">
      {segments}
    </svg>
  );
}
