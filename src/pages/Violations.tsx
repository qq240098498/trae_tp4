import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { AlertOctagon, ShieldAlert, User, Users, Search, Plus, Eye, Clock, MapPin, FileText, AlertTriangle, CheckCircle2, Gavel, BarChart3 } from 'lucide-react';
import Modal from '@/components/Modal';

const SEVERITY_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  minor: { label: '轻微', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  moderate: { label: '一般', color: 'text-yellow-700', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  major: { label: '严重', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  serious: { label: '重大', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
};
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-red-100 text-red-700' },
  investigating: { label: '调查中', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '已确认', color: 'bg-orange-100 text-orange-700' },
  appealed: { label: '申诉中', color: 'bg-purple-100 text-purple-700' },
  resolved: { label: '已处理', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已撤销', color: 'bg-gray-100 text-gray-500' },
};
const PENALTY_MAP: Record<string, string> = { warning: '警告', fine: '罚款', suspension: '停职/停课', termination: '除名/解约', other: '其他' };
const VIOLATOR_LABEL: Record<string, string> = { coach_late: '教练迟到', coach_absent: '教练旷工', coach_early_leave: '教练早退', coach_smoking: '教学区吸烟', coach_verbal_abuse: '语言侮辱学员', coach_solicit_fee: '私自收费', student_late: '学员迟到', student_absent: '学员旷课', student_misconduct: '学员违纪', cheating: '作弊行为', safety_violation: '安全违规', equipment_misuse: '设备操作不当', other: '其他违规' };

export default function Violations() {
  const [overview, setOverview] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showHandle, setShowHandle] = useState<any>(null);
  const [showAppeal, setShowAppeal] = useState<any>(null);
  const [form, setForm] = useState({ violation_type: '', violator_type: 'coach', violator_id: '', title: '', description: '', occurrence_time: new Date().toISOString().substring(0, 16), location: '', severity: 'minor', penalty_type: '', penalty_detail: '', penalty_amount: 0 });

  useEffect(() => { loadOverview(); loadList(); loadMeta(); loadRanking(); }, [page, typeFilter, severityFilter, statusFilter]);

  const loadOverview = async () => { const res: any = await api.get('/violations/summary/overview'); if (res.success) setOverview(res.data); };
  const loadList = async () => {
    const params = new URLSearchParams({ page: String(page), limit: 15 });
    if (typeFilter) params.append('violation_type', typeFilter);
    if (severityFilter) params.append('severity', severityFilter);
    if (statusFilter) params.append('status', statusFilter);
    const res: any = await api.get(`/violations?${params.toString()}`);
    if (res.success) { setViolations(res.data.list.filter((v: any) => !search || v.violator_name?.includes(search) || v.title?.includes(search))); setTotal(res.data.total); }
  };
  const loadMeta = async () => {
    const [c, s, t] = await Promise.all([api.get<any>('/coaches'), api.get<any>('/students?limit=200'), api.get<any>('/violations/violation-types')]);
    if (c.success) setCoaches(c.data);
    if (s.success) setStudents(s.data.list || []);
    if (t.success) setTypes(t.data);
  };
  const loadRanking = async () => { const res: any = await api.get('/violations/ranking/coaches'); if (res.success) setRanking(res.data); };
  const loadDetail = async (id: number) => { const res: any = await api.get(`/violations/${id}`); if (res.success) setShowDetail(res.data); };

  const handleCreate = async () => {
    if (!form.violation_type || !form.violator_id || !form.title || !form.description) { alert('请填写必填项'); return; }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const res: any = await api.post('/violations', { ...form, reporter_id: user.id });
    if (res.success) {
      alert('提交成功'); setShowCreate(false);
      setForm({ violation_type: '', violator_type: 'coach', violator_id: '', title: '', description: '', occurrence_time: new Date().toISOString().substring(0, 16), location: '', severity: 'minor', penalty_type: '', penalty_detail: '', penalty_amount: 0 });
      loadOverview(); loadList(); loadRanking();
    }
  };

  const handleResolve = async () => {
    if (!showHandle) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const res: any = await api.put(`/violations/${showHandle.id}/handle`, { ...showHandle, handler_id: user.id });
    if (res.success) { alert('处理成功'); setShowHandle(null); loadOverview(); loadList(); }
  };

  const handleAppealSubmit = async () => {
    if (!showAppeal?.appeal_reason) { alert('请填写申诉理由'); return; }
    const res: any = await api.post(`/violations/${showAppeal.id}/appeal`, { appeal_reason: showAppeal.appeal_reason });
    if (res.success) { alert('申诉已提交'); setShowAppeal(null); loadList(); loadOverview(); }
  };

  const violatorList = form.violator_type === 'coach' ? coaches : students;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> 违规行为监管
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">全流程违规管理，建立规范教学秩序</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
          <Plus size={18} /> 登记违规
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={AlertOctagon} label="待处理" value={overview.pending_count} color="red" />
          <StatCard icon={Search} label="调查中" value={overview.investigating_count} color="yellow" />
          <StatCard icon={Gavel} label="申诉中" value={overview.appealed_count} color="purple" />
          <StatCard icon={BarChart3} label="本月累计" value={overview.total_this_month} color="blue" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索违规人或标题..." className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">全部类型</option>
              {types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
            <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">全部严重度</option>
              {Object.entries(SEVERITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">全部状态</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-3 font-medium text-[var(--text-secondary)]">违规人</th>
                  <th className="text-left py-3 px-3 font-medium text-[var(--text-secondary)]">类型</th>
                  <th className="text-center py-3 px-3 font-medium text-[var(--text-secondary)]">严重度</th>
                  <th className="text-left py-3 px-3 font-medium text-[var(--text-secondary)]">标题</th>
                  <th className="text-center py-3 px-3 font-medium text-[var(--text-secondary)]">时间</th>
                  <th className="text-center py-3 px-3 font-medium text-[var(--text-secondary)]">状态</th>
                  <th className="text-center py-3 px-3 font-medium text-[var(--text-secondary)]">操作</th>
                </tr>
              </thead>
              <tbody>
                {violations.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-[var(--text-secondary)]">暂无违规记录</td></tr>
                ) : violations.map((v) => {
                  const sev = SEVERITY_MAP[v.severity] || SEVERITY_MAP.minor;
                  const st = STATUS_MAP[v.status] || STATUS_MAP.pending;
                  return (
                    <tr key={v.id} className="border-b border-[var(--border)]/50 hover:bg-red-50/30">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full ${v.violator_type === 'coach' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center`}>
                            {v.violator_type === 'coach' ? <User size={14} /> : <Users size={14} />}
                          </div>
                          <div>
                            <div className="font-medium text-[var(--text)]">{v.violator_name}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{v.violator_type === 'coach' ? '教练' : '学员'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs font-medium text-[var(--text)]">{v.violation_type_name || VIOLATOR_LABEL[v.violation_type] || v.violation_type}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} /> {sev.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-[200px]"><p className="text-[var(--text)] truncate text-xs">{v.title}</p></td>
                      <td className="py-3 px-3 text-center text-[var(--text-secondary)] text-xs whitespace-nowrap">{v.occurrence_time?.substring(0, 16).replace('T', ' ')}</td>
                      <td className="py-3 px-3 text-center"><span className={`px-2 py-0.5 rounded text-xs ${st.color}`}>{st.label}</span></td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => loadDetail(v.id)} className="p-1 text-primary hover:bg-blue-50 rounded" title="查看"><Eye size={14} /></button>
                          {['pending', 'investigating', 'appealed'].includes(v.status) && (
                            <button onClick={() => setShowHandle({ id: v.id, status: 'resolved', penalty_type: v.penalty_type || '', penalty_detail: v.penalty_detail || '', penalty_amount: v.penalty_amount || 0, resolution_note: '' })} className="p-1 text-green-600 hover:bg-green-50 rounded" title="处理"><CheckCircle2 size={14} /></button>
                          )}
                          {v.status === 'confirmed' && (
                            <button onClick={() => setShowAppeal({ id: v.id, appeal_reason: '' })} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="申诉"><AlertTriangle size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {total > 15 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
              <span className="text-sm text-[var(--text-secondary)]">第 {page} 页</span>
              <button onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded">下一页</button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
            <h4 className="font-medium text-[var(--text)] mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-red-500" /> 违规类型统计</h4>
            <div className="space-y-2.5">
              {overview?.by_type?.slice(0, 6).map((t: any, i: number) => {
                const pct = overview.total_this_month > 0 ? (t.count / overview.total_this_month) * 100 : 0;
                const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-purple-400', 'bg-blue-400', 'bg-green-400'];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--text)]">{t.type_name}</span>
                      <span className="text-[var(--text-secondary)]">{t.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${colors[i % 6]}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
              {(!overview?.by_type || overview.by_type.length === 0) && <div className="text-xs text-[var(--text-secondary)] text-center py-4">暂无数据</div>}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
            <h4 className="font-medium text-[var(--text)] mb-3 flex items-center gap-2"><AlertOctagon size={16} className="text-red-500" /> 教练违规排名</h4>
            <div className="space-y-2">
              {ranking.slice(0, 5).map((r, i) => (
                <div key={r.violator_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-red-500 text-white' : i === 1 ? 'bg-orange-400 text-white' : i === 2 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text)] truncate">{r.coach_name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{r.violation_count}次 · 扣{r.total_deduction}分</div>
                  </div>
                </div>
              ))}
              {ranking.length === 0 && <div className="text-xs text-[var(--text-secondary)] text-center py-4">暂无数据</div>}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
            <h4 className="font-medium text-[var(--text)] mb-3 flex items-center gap-2"><FileText size={16} className="text-red-500" /> 严重程度分布</h4>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(SEVERITY_MAP).map(([k, cfg]) => {
                const count = overview?.by_severity?.find((s: any) => s.severity === k)?.count || 0;
                return (
                  <div key={k} className={`p-2.5 ${cfg.bg} rounded-lg text-center`}>
                    <div className="text-xl font-bold text-[var(--text)]">{count}</div>
                    <div className={`text-xs ${cfg.color}`}>{cfg.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <Modal title="登记违规记录" onClose={() => setShowCreate(false)} width="max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">违规对象类型</label>
              <select value={form.violator_type} onChange={(e) => setForm({ ...form, violator_type: e.target.value, violator_id: '' })} className="w-full px-3 py-2 border rounded-lg">
                <option value="coach">教练</option><option value="student">学员</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">违规人 <span className="text-red-500">*</span></label>
              <select value={form.violator_id} onChange={(e) => setForm({ ...form, violator_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="">请选择</option>
                {violatorList.map((v: any) => <option key={v.id} value={v.id}>{v.name} {v.phone ? `(${v.phone})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">违规类型 <span className="text-red-500">*</span></label>
              <select value={form.violation_type} onChange={(e) => { const t = types.find(x => x.key === e.target.value); setForm({ ...form, violation_type: e.target.value, title: form.title || t?.name || '' }); }} className="w-full px-3 py-2 border rounded-lg">
                <option value="">请选择类型</option>
                {types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">严重程度</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                {Object.entries(SEVERITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">违规标题 <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">详细描述 <span className="text-red-500">*</span></label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">发生时间</label>
              <input type="datetime-local" value={form.occurrence_time} onChange={(e) => setForm({ ...form, occurrence_time: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">发生地点</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full pl-9 pr-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">拟处理方式</label>
              <select value={form.penalty_type} onChange={(e) => setForm({ ...form, penalty_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="">暂不处理</option>
                {Object.entries(PENALTY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">罚款金额 (元)</label>
              <input type="number" value={form.penalty_amount} onChange={(e) => setForm({ ...form, penalty_amount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">处理说明</label>
              <textarea rows={2} value={form.penalty_detail} onChange={(e) => setForm({ ...form, penalty_detail: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">提交登记</button>
          </div>
        </Modal>
      )}

      {showDetail && (
        <Modal title="违规详情" onClose={() => setShowDetail(null)} width="max-w-2xl">
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${SEVERITY_MAP[showDetail.severity]?.bg} border`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">{showDetail.violation_type_name || VIOLATOR_LABEL[showDetail.violation_type]}</div>
                  <div className="text-lg font-bold text-[var(--text)]">{showDetail.title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${SEVERITY_MAP[showDetail.severity]?.bg} ${SEVERITY_MAP[showDetail.severity]?.color}`}>{SEVERITY_MAP[showDetail.severity]?.label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_MAP[showDetail.status]?.color}`}>{STATUS_MAP[showDetail.status]?.label}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="违规人" value={`${showDetail.violator_type === 'coach' ? '教练' : '学员'} · ${showDetail.violator_name}`} />
                <InfoItem label="举报人" value={showDetail.reporter_name || '-'} />
                <InfoItem label="发生时间" value={showDetail.occurrence_time?.replace('T', ' ')} />
                <InfoItem label="地点" value={showDetail.location || '-'} />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1.5 flex items-center gap-1"><FileText size={14} /> 情况描述</div>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{showDetail.description}</div>
            </div>
            {showDetail.penalty_type && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-1"><Gavel size={14} /> 处罚信息</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoItem label="处罚类型" value={PENALTY_MAP[showDetail.penalty_type] || '-'} />
                  <InfoItem label="罚款金额" value={showDetail.penalty_amount ? `¥${showDetail.penalty_amount}` : '-'} />
                </div>
                {showDetail.penalty_detail && <p className="text-sm text-orange-700 mt-2">{showDetail.penalty_detail}</p>}
              </div>
            )}
            {showDetail.resolution_note && (
              <div><div className="text-sm font-medium mb-1.5">处理备注</div><div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">{showDetail.resolution_note}</div></div>
            )}
            {showDetail.is_appealed && showDetail.appeal_reason && (
              <div><div className="text-sm font-medium mb-1.5 text-purple-700">申诉理由</div><div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-700">{showDetail.appeal_reason}</div></div>
            )}
            {showDetail.history?.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-1"><Clock size={14} /> 历史违规 ({showDetail.history.length})</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {showDetail.history.map((h: any) => (
                    <div key={h.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--text)]">{h.violation_type_name || VIOLATOR_LABEL[h.violation_type]}</span>
                        <span className={`px-1.5 py-0.5 rounded ${SEVERITY_MAP[h.severity]?.bg} ${SEVERITY_MAP[h.severity]?.color}`}>{SEVERITY_MAP[h.severity]?.label}</span>
                      </div>
                      <div className="text-[var(--text-secondary)] mt-0.5">{h.occurrence_time?.substring(0, 10)} · {STATUS_MAP[h.status]?.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
              {showDetail.status === 'confirmed' && (
                <button onClick={() => setShowAppeal({ id: showDetail.id, appeal_reason: '' })} className="px-4 py-2 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50">申诉</button>
              )}
              {['pending', 'investigating', 'appealed'].includes(showDetail.status) && (
                <button onClick={() => { setShowHandle({ id: showDetail.id, status: 'resolved', penalty_type: showDetail.penalty_type || '', penalty_detail: showDetail.penalty_detail || '', penalty_amount: showDetail.penalty_amount || 0, resolution_note: '' }); setShowDetail(null); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">处理</button>
              )}
              <button onClick={() => setShowDetail(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">关闭</button>
            </div>
          </div>
        </Modal>
      )}

      {showHandle && (
        <Modal title="处理违规" onClose={() => setShowHandle(null)} width="max-w-md">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1.5">处理状态</label>
              <select value={showHandle.status} onChange={(e) => setShowHandle({ ...showHandle, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="investigating">调查中</option>
                <option value="confirmed">已确认违规</option>
                <option value="resolved">已处理完成</option>
                <option value="cancelled">撤销记录</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">处罚方式</label>
              <select value={showHandle.penalty_type} onChange={(e) => setShowHandle({ ...showHandle, penalty_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="">不处罚</option>
                {Object.entries(PENALTY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">罚款金额 (元)</label>
              <input type="number" value={showHandle.penalty_amount} onChange={(e) => setShowHandle({ ...showHandle, penalty_amount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div><label className="block text-sm font-medium mb-1.5">处理细节</label>
              <input value={showHandle.penalty_detail} onChange={(e) => setShowHandle({ ...showHandle, penalty_detail: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div><label className="block text-sm font-medium mb-1.5">处理备注 <span className="text-red-500">*</span></label>
              <textarea rows={3} value={showHandle.resolution_note} onChange={(e) => setShowHandle({ ...showHandle, resolution_note: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button onClick={() => setShowHandle(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleResolve} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">确认处理</button>
            </div>
          </div>
        </Modal>
      )}

      {showAppeal && (
        <Modal title="提交申诉" onClose={() => setShowAppeal(null)} width="max-w-md">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1.5">申诉理由 <span className="text-red-500">*</span></label>
              <textarea rows={5} value={showAppeal.appeal_reason} onChange={(e) => setShowAppeal({ ...showAppeal, appeal_reason: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="请详细说明申诉理由..." />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button onClick={() => setShowAppeal(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleAppealSubmit} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">提交申诉</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = { red: 'from-red-500 to-red-600', yellow: 'from-yellow-500 to-orange-500', purple: 'from-purple-500 to-purple-600', blue: 'from-blue-500 to-blue-600' };
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--border)]">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white`}><Icon size={20} /></div>
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
    </div>
  );
}

function InfoItem({ label, value }: any) {
  return <div><div className="text-xs text-[var(--text-secondary)]">{label}</div><div className="text-sm font-medium text-[var(--text)]">{value || '-'}</div></div>;
}
