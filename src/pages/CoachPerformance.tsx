import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { Trophy, TrendingUp, Users, Clock, Star, AlertCircle, Plus, Search, Filter, Award, Target, Zap } from 'lucide-react';
import Modal from '@/components/Modal';

const GRADE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  excellent: { label: '优秀', color: 'text-green-700', bg: 'bg-green-100' },
  good: { label: '良好', color: 'text-blue-700', bg: 'bg-blue-100' },
  pass: { label: '合格', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  fail: { label: '不合格', color: 'text-red-700', bg: 'bg-red-100' },
  pending: { label: '待评定', color: 'text-gray-700', bg: 'bg-gray-100' },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  published: { label: '已发布', color: 'bg-green-100 text-green-700' },
  archived: { label: '已归档', color: 'bg-blue-100 text-blue-700' },
};

export default function CoachPerformance() {
  const [performances, setPerformances] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [periodType, setPeriodType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [form, setForm] = useState({ coach_id: '', period_type: 'monthly', period_start: '', period_end: '', target_hours: 160, status: 'draft', remark: '' });
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadCoaches();
    loadRules();
  }, [page, periodType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res: any = await api.get(`/coach-performance?page=${page}&limit=15${periodType ? `&period_type=${periodType}` : ''}`);
      if (res.success) {
        setPerformances(res.data.list.filter((p: any) => !search || p.coach_name?.includes(search)));
        setTotal(res.data.total);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  const loadCoaches = async () => {
    try { const res: any = await api.get('/coaches'); if (res.success) setCoaches(res.data); } catch (e) { /* ignore */ }
  };

  const loadRules = async () => {
    try { const res: any = await api.get('/coach-performance/rules'); if (res.success) setRules(res.data); } catch (e) { /* ignore */ }
  };

  const handlePreview = async () => {
    if (!form.coach_id || !form.period_start || !form.period_end) {
      alert('请填写教练、考核周期开始和结束日期');
      return;
    }
    const res: any = await api.post('/coach-performance/calculate', form);
    if (res.success) setPreview(res.data);
  };

  const handleCreate = async () => {
    if (!form.coach_id || !form.period_start || !form.period_end) {
      alert('请填写必填项');
      return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const res: any = await api.post('/coach-performance', { ...form, created_by: user.id });
    if (res.success) {
      alert('创建成功');
      setShowCreate(false);
      setPreview(null);
      setForm({ coach_id: '', period_type: 'monthly', period_start: '', period_end: '', target_hours: 160, status: 'draft', remark: '' });
      loadData();
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    const res: any = await api.put(`/coach-performance/${id}`, { status });
    if (res.success) {
      alert('更新成功');
      loadData();
      if (showDetail?.id === id) setShowDetail(res.data);
    }
  };

  const loadDetail = async (id: number) => {
    const res: any = await api.get(`/coach-performance/${id}`);
    if (res.success) setShowDetail(res.data);
  };

  const activeRule = rules.find((r) => r.period_type === form.period_type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <Trophy className="text-yellow-500" /> 教练绩效考核
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">综合评估教练工作表现，支持月度/季度/年度考核</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus size={18} /> 新增考核
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Award} label="已发布考核" value={performances.filter(p => p.status === 'published').length} color="blue" />
        <StatCard icon={TrendingUp} label="本月平均分" value={performances.length > 0 ? (performances.reduce((s, p) => s + (p.composite_score || 0), 0) / performances.length).toFixed(1) : '0.0'} suffix="分" color="green" />
        <StatCard icon={Star} label="优秀教练" value={performances.filter(p => p.grade === 'excellent').length} color="yellow" />
        <StatCard icon={AlertCircle} label="待处理" value={performances.filter(p => p.status === 'draft').length} color="orange" />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索教练姓名..." className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <select value={periodType} onChange={(e) => { setPeriodType(e.target.value); setPage(1); }} className="px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">全部周期</option>
            <option value="monthly">月度</option>
            <option value="quarterly">季度</option>
            <option value="yearly">年度</option>
          </select>
          <div className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)]">
            <Filter size={16} /> 筛选
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">教练</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">周期</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">考核期</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">学时</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">通过率</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">评价</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">违规</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">综合分</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">等级</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">排名</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">状态</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-[var(--text-secondary)]">加载中...</td></tr>
              ) : performances.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-[var(--text-secondary)]">暂无考核记录</td></tr>
              ) : performances.map((p) => {
                const grade = GRADE_MAP[p.grade] || GRADE_MAP.pending;
                const status = STATUS_MAP[p.status] || STATUS_MAP.draft;
                return (
                  <tr key={p.id} className="border-b border-[var(--border)]/50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-[var(--text)]">{p.coach_name || '-'}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {{ monthly: '月度', quarterly: '季度', yearly: '年度' }[p.period_type] || p.period_type}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">{p.period_start} ~ {p.period_end}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-[var(--text)] font-medium">{p.total_hours?.toFixed(1)}h</div>
                      <div className="text-xs text-[var(--text-secondary)]">{p.hours_achievement?.toFixed(0)}%</div>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--text)]">{p.pass_rate?.toFixed(0)}%</td>
                    <td className="py-3 px-4 text-center text-[var(--text)]">{p.avg_evaluation_score?.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center text-[var(--text)]">{p.violation_count}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-lg font-bold text-[var(--text)]">{p.composite_score?.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${grade.bg} ${grade.color}`}>{grade.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--text)] font-medium">#{p.ranking || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => loadDetail(p.id)} className="text-primary hover:underline text-xs">详情</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > 15 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50">上一页</button>
            <span className="text-sm text-[var(--text-secondary)]">第 {page} 页 / 共 {Math.ceil(total / 15)} 页</span>
            <button onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded hover:bg-gray-50">下一页</button>
          </div>
        )}
      </div>

      <Modal isOpen={showCreate} title="创建教练考核" onClose={() => { setShowCreate(false); setPreview(null); }} width="max-w-3xl">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">教练 <span className="text-red-500">*</span></label>
              <select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">请选择教练</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">考核周期类型</label>
              <select value={form.period_type} onChange={(e) => setForm({ ...form, period_type: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="monthly">月度考核</option>
                <option value="quarterly">季度考核</option>
                <option value="yearly">年度考核</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">开始日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">结束日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">目标学时 (小时)</label>
              <input type="number" value={form.target_hours} onChange={(e) => setForm({ ...form, target_hours: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">状态</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="draft">草稿</option>
                <option value="published">立即发布</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">备注</label>
              <textarea rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
          {activeRule && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <div className="font-medium mb-1.5">考核权重规则 ({form.period_type === 'monthly' ? '月度' : form.period_type === 'quarterly' ? '季度' : '年度'})</div>
              <div className="flex flex-wrap gap-3">
                <span>学时达标: {(activeRule.hours_weight * 100).toFixed(0)}%</span>
                <span>考试通过率: {(activeRule.pass_rate_weight * 100).toFixed(0)}%</span>
                <span>学员评价: {(activeRule.evaluation_weight * 100).toFixed(0)}%</span>
                <span>出勤率: {(activeRule.attendance_weight * 100).toFixed(0)}%</span>
                <span>违规扣分: {(activeRule.violation_weight * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
          <div className="flex gap-3 mb-4">
            <button onClick={handlePreview} className="flex-1 flex items-center justify-center gap-2 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors">
              <Zap size={16} /> 预计算评分
            </button>
          </div>
          {preview && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100">
              <div className="grid grid-cols-5 gap-3 mb-3 text-center text-sm">
                <div><div className="text-xs text-[var(--text-secondary)]">总学时</div><div className="font-bold text-[var(--text)]">{preview.total_hours}h ({preview.hours_achievement}%)</div></div>
                <div><div className="text-xs text-[var(--text-secondary)]">通过率</div><div className="font-bold text-[var(--text)]">{preview.pass_rate}%</div></div>
                <div><div className="text-xs text-[var(--text-secondary)]">平均评价</div><div className="font-bold text-[var(--text)]">{preview.avg_evaluation_score}</div></div>
                <div><div className="text-xs text-[var(--text-secondary)]">出勤率</div><div className="font-bold text-[var(--text)]">{preview.on_time_rate}%</div></div>
                <div><div className="text-xs text-[var(--text-secondary)]">违规次数</div><div className="font-bold text-[var(--text)]">{preview.violation_count}</div></div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{preview.composite_score}</div>
                  <div className="text-xs text-[var(--text-secondary)]">综合得分</div>
                </div>
                <div className={`px-4 py-2 rounded-lg text-lg font-bold ${GRADE_MAP[preview.grade]?.bg} ${GRADE_MAP[preview.grade]?.color}`}>
                  {GRADE_MAP[preview.grade]?.label}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowCreate(false); setPreview(null); }} className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">确认创建</button>
          </div>
        </Modal>

      <Modal isOpen={!!showDetail} title={`考核详情 - ${showDetail?.coach_name || ''}`} onClose={() => setShowDetail(null)} width="max-w-4xl">
          <div className="space-y-4">
            {showDetail && (
              <>
            <div className="grid grid-cols-4 gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
              <InfoBlock label="考核周期" value={{ monthly: '月度', quarterly: '季度', yearly: '年度' }[showDetail.period_type] || showDetail.period_type} />
              <InfoBlock label="考核期间" value={`${showDetail.period_start} ~ ${showDetail.period_end}`} />
              <InfoBlock label="教练电话" value={showDetail.coach_phone || '-'} />
              <InfoBlock label="创建人" value={showDetail.creator_name || '-'} />
            </div>
            <div className="grid grid-cols-5 gap-4">
              <MetricCard icon={Clock} label="学时达标率" value={`${showDetail.hours_achievement?.toFixed(0)}%`} sub={`${showDetail.total_hours?.toFixed(1)}h / ${showDetail.target_hours}h`} color="blue" />
              <MetricCard icon={Target} label="考试通过率" value={`${showDetail.pass_rate?.toFixed(0)}%`} sub={`${showDetail.pass_count}/${showDetail.exam_count}人`} color="green" />
              <MetricCard icon={Star} label="学员评价" value={showDetail.avg_evaluation_score?.toFixed(1)} sub={`${showDetail.student_count}名学员`} color="yellow" />
              <MetricCard icon={TrendingUp} label="出勤率" value={`${showDetail.on_time_rate?.toFixed(0)}%`} sub="准时上岗" color="purple" />
              <MetricCard icon={AlertCircle} label="违规次数" value={showDetail.violation_count} sub={`扣${showDetail.violation_deduction}分`} color="red" />
            </div>
            <div className="flex items-center justify-center gap-8 p-6 bg-gradient-to-r from-primary/5 to-green-50 rounded-xl">
              <div className="text-center">
                <div className="text-xs text-[var(--text-secondary)] mb-1">综合得分</div>
                <div className="text-5xl font-bold text-primary">{showDetail.composite_score?.toFixed(1)}</div>
              </div>
              <div className={`px-6 py-3 rounded-xl text-2xl font-bold ${GRADE_MAP[showDetail.grade]?.bg} ${GRADE_MAP[showDetail.grade]?.color}`}>
                {GRADE_MAP[showDetail.grade]?.label}
              </div>
              {showDetail.ranking && (
                <div className="text-center">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">本期排名</div>
                  <div className="text-3xl font-bold text-yellow-600">#{showDetail.ranking}</div>
                </div>
              )}
            </div>
            {showDetail.evaluations?.length > 0 && (
              <div>
                <h4 className="font-medium text-[var(--text)] mb-2 flex items-center gap-2"><Star size={16} className="text-yellow-500" /> 相关学员评价 ({showDetail.evaluations.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {showDetail.evaluations.slice(0, 5).map((e: any) => (
                    <div key={e.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[var(--text)]">{e.student_name}</span>
                        <span className="text-yellow-500 text-sm">{'★'.repeat(Math.round(e.overall_score))}{'☆'.repeat(5 - Math.round(e.overall_score))}</span>
                      </div>
                      {e.comment && <p className="text-xs text-[var(--text-secondary)]">{e.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showDetail.remark && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="text-xs font-medium text-yellow-800 mb-1">备注</div>
                <p className="text-sm text-yellow-700">{showDetail.remark}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
              {showDetail?.status === 'draft' && (
                <button onClick={() => handleUpdateStatus(showDetail.id, 'published')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">发布考核</button>
              )}
              <button onClick={() => setShowDetail(null)} className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-gray-50">关闭</button>
            </div>
            </>
            )}
          </div>
        </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix = '', color }: any) {
  const colors: Record<string, string> = { blue: 'from-blue-500 to-blue-600', green: 'from-green-500 to-green-600', yellow: 'from-yellow-500 to-orange-500', orange: 'from-orange-500 to-red-500' };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white`}>
          <Icon size={20} />
        </div>
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text)]">{value}{suffix}</div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600', yellow: 'bg-yellow-100 text-yellow-600', purple: 'bg-purple-100 text-purple-600', red: 'bg-red-100 text-red-600' };
  return (
    <div className="bg-white rounded-xl p-4 border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon size={14} /></div>
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-xl font-bold text-[var(--text)]">{value}</div>
      <div className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</div>
    </div>
  );
}

function InfoBlock({ label, value }: any) {
  return (
    <div>
      <div className="text-xs text-[var(--text-secondary)] mb-1">{label}</div>
      <div className="text-sm font-medium text-[var(--text)]">{value}</div>
    </div>
  );
}
